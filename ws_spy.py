import asyncio
import websockets
import json
import sys

# Konfigurace
ADDR = "127.0.0.1"
PORT = 32123

async def handle_client(websocket):
    remote_addr = websocket.remote_address
    print(f"--- Client connected from {remote_addr} ---")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                print(f"[{remote_addr}] Received JSON: {json.dumps(data, indent=2)}")
            except json.JSONDecodeError:
                print(f"[{remote_addr}] Received Raw: {message}")
    except websockets.exceptions.ConnectionClosed:
        print(f"--- Client {remote_addr} disconnected ---")
    except Exception as e:
        print(f"Error handling client: {e}")

async def start_server():
    print(f"Starting WebSocket SERVER on ws://{ADDR}:{PORT}...")
    try:
        async with websockets.serve(handle_client, ADDR, PORT):
            print("Server is running. Waiting for signals from Blender...")
            await asyncio.Future()  # Běží navždy
    except Exception as e:
        print(f"Failed to start server: {e}")
        if "Address already in use" in str(e):
            print("TIP: Blendmate application is probably already running on this port.")

if __name__ == "__main__":
    print("=== Blendmate WS Spy (Server Mode) ===")
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        print("\nStopping server...")
        sys.exit(0)
