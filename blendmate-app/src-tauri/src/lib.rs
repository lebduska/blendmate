use futures_util::StreamExt;
use tokio::net::TcpListener;
use tokio_tungstenite::{accept_async, tungstenite::Message};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

const WS_ADDRESS: &str = "127.0.0.1:32123";

fn start_websocket_server(app_handle: tauri::AppHandle) {
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

            tauri::async_runtime::spawn(async move {
                match accept_async(stream).await {
                    Ok(mut websocket) => {
                        let _ = app_handle.emit_all("ws:status", "connected");

                        while let Some(message_result) = websocket.next().await {
                            match message_result {
                                Ok(Message::Text(text)) => {
                                    let _ = app_handle.emit_all("ws:message", text);
                                }
                                Ok(Message::Close(_)) => break,
                                Ok(_) => {}
                                Err(err) => {
                                    eprintln!("WebSocket read error: {err}");
                                    break;
                                }
                            }
                        }
                    }
                    Err(err) => {
                        eprintln!("WebSocket handshake error: {err}");
                    }
                }

                let _ = app_handle.emit_all("ws:status", "disconnected");
            });
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            start_websocket_server(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
