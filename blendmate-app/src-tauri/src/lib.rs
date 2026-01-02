use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};
use tauri::{Emitter, State};

type WsConnection = Arc<Mutex<Option<futures_util::stream::SplitSink<WebSocketStream<tokio::net::TcpStream>, Message>>>>;

struct AppState {
    ws_sender: WsConnection,
}

const WS_ADDRESS: &str = "127.0.0.1:32123";

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
        .invoke_handler(tauri::generate_handler![send_to_blender])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
