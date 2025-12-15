use futures_util::StreamExt;
use tokio::net::TcpListener;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tauri::{Emitter, Manager};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

const WS_ADDRESS: &str = "127.0.0.1:32123";

fn start_websocket_server<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) {
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
                        if let Err(err) = app_handle.emit("ws:status", "connected") {
                            eprintln!("Failed to emit ws:status connected: {err}");
                        }

                        let mut disconnected_emitted = false;
                        let mut emit_disconnected = |disconnected_emitted: &mut bool| {
                            if *disconnected_emitted {
                                return;
                            }

                            if let Err(err) = app_handle.emit("ws:status", "disconnected") {
                                eprintln!("Failed to emit ws:status disconnected: {err}");
                            }

                            *disconnected_emitted = true;
                        };

                        while let Some(message_result) = websocket.next().await {
                            match message_result {
                                Ok(Message::Text(text)) => {
                                    if let Err(err) = app_handle.emit("ws:message", text) {
                                        eprintln!("Failed to emit ws:message: {err}");
                                        emit_disconnected(&mut disconnected_emitted);
                                        break;
                                    }
                                }
                                Ok(Message::Close(_)) => {
                                    emit_disconnected(&mut disconnected_emitted);
                                    break;
                                }
                                Ok(_) => {}
                                Err(err) => {
                                    eprintln!("WebSocket read error: {err}");
                                    emit_disconnected(&mut disconnected_emitted);
                                    break;
                                }
                            }
                        }

                        emit_disconnected(&mut disconnected_emitted);
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            start_websocket_server(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
