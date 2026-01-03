use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use std::fs;
use std::path::Path;
use std::process::Stdio;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio::process::Command;
use tokio::io::AsyncWriteExt;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};
use tauri::{Emitter, State};
use serde::Serialize;

type WsConnection = Arc<Mutex<Option<futures_util::stream::SplitSink<WebSocketStream<tokio::net::TcpStream>, Message>>>>;

struct AppState {
    ws_sender: WsConnection,
}

const WS_ADDRESS: &str = "127.0.0.1:32123";

#[derive(Serialize)]
struct FileInfo {
    path: String,
    filename: String,
    size_bytes: u64,
    size_human: String,
    modified: Option<String>,
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

/// Ask Claude CLI for AI response (uses pipe mode)
#[tauri::command]
async fn ask_claude(prompt: String, system_prompt: String) -> Result<String, String> {
    // Build the full prompt with system context
    let full_prompt = if system_prompt.is_empty() {
        prompt
    } else {
        format!("{}\n\n---\n\n{}", system_prompt, prompt)
    };

    let mut child = Command::new("claude")
        .args(["-p", "--output-format", "text"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn claude CLI: {}. Is it installed?", e))?;

    // Write prompt to stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(full_prompt.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to claude stdin: {}", e))?;
    }

    // Wait for response
    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("Failed to get claude output: {}", e))?;

    if output.status.success() {
        String::from_utf8(output.stdout)
            .map_err(|e| format!("Invalid UTF-8 in response: {}", e))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Claude CLI error: {}", stderr))
    }
}

/// Get file metadata for display
#[tauri::command]
fn get_file_info(path: String) -> Result<FileInfo, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File not found".to_string());
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    let size_bytes = metadata.len();

    let modified = metadata.modified().ok().map(|time| {
        let datetime: chrono::DateTime<chrono::Local> = time.into();
        datetime.format("%Y-%m-%d %H:%M").to_string()
    });

    let filename = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(FileInfo {
        path,
        filename,
        size_bytes,
        size_human: format_size(size_bytes),
        modified,
    })
}

/// Send a message to Blender addon via WebSocket
#[tauri::command]
async fn send_to_blender(message: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut sender_guard = state.ws_sender.lock().await;
    if let Some(sender) = sender_guard.as_mut() {
        sender
            .send(Message::Text(message))
            .await
            .map_err(|e| format!("Failed to send: {}", e))?;
        Ok(())
    } else {
        Err("No WebSocket connection".to_string())
    }
}

fn start_websocket_server<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    ws_sender: WsConnection,
) {
    tauri::async_runtime::spawn(async move {
        let listener = match TcpListener::bind(WS_ADDRESS).await {
            Ok(listener) => listener,
            Err(err) => {
                eprintln!("Failed to bind WebSocket listener on {WS_ADDRESS}: {err}");
                return;
            }
        };

        loop {
            let (stream, _) = match listener.accept().await {
                Ok(connection) => connection,
                Err(err) => {
                    eprintln!("WebSocket accept error: {err}");
                    continue;
                }
            };

            let app_handle = app_handle.clone();
            let ws_sender = ws_sender.clone();

            tauri::async_runtime::spawn(async move {
                match accept_async(stream).await {
                    Ok(websocket) => {
                        let (sender, mut receiver) = websocket.split();

                        // Store sender for outgoing messages
                        {
                            let mut sender_guard = ws_sender.lock().await;
                            *sender_guard = Some(sender);
                        }

                        if let Err(err) = app_handle.emit("ws:status", "connected") {
                            eprintln!("Failed to emit ws:status connected: {err}");
                        }

                        // Read incoming messages
                        while let Some(message_result) = receiver.next().await {
                            match message_result {
                                Ok(Message::Text(text)) => {
                                    if let Err(err) = app_handle.emit("ws:message", text) {
                                        eprintln!("Failed to emit ws:message: {err}");
                                        break;
                                    }
                                }
                                Ok(Message::Close(_)) => {
                                    break;
                                }
                                Ok(_) => {}
                                Err(err) => {
                                    eprintln!("WebSocket read error: {err}");
                                    break;
                                }
                            }
                        }

                        // Clear sender on disconnect
                        {
                            let mut sender_guard = ws_sender.lock().await;
                            *sender_guard = None;
                        }

                        if let Err(err) = app_handle.emit("ws:status", "disconnected") {
                            eprintln!("Failed to emit ws:status disconnected: {err}");
                        }
                    }
                    Err(err) => {
                        eprintln!("WebSocket handshake error: {err}");

                        if let Err(err) = app_handle.emit("ws:status", "disconnected") {
                            eprintln!("Failed to emit ws:status disconnected: {err}");
                        }
                    }
                }
            });
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ws_sender: WsConnection = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            ws_sender: ws_sender.clone(),
        })
        .setup(move |app| {
            start_websocket_server(app.handle().clone(), ws_sender.clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![send_to_blender, get_file_info, ask_claude])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
