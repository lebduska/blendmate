import asyncio
import websockets
import json
import subprocess
import time
import os
import signal

async def test_integration():
    print("Starting Integration Test...")
    
    # 1. Start Tauri app (mock server)
    # Since we can't easily start the whole Tauri app in headless test, 
    # we will use a simple python mock server that acts like the Tauri WS server.
    
    port = 32124
    received_messages = []

    async def mock_server(websocket):
        print("Server: Client connected")
        async for message in websocket:
            print(f"Server: Received {message}")
            received_messages.append(json.loads(message))

    server = await websockets.serve(mock_server, "127.0.0.1", port)
    print(f"Mock Server started on ws://127.0.0.1:{port}")

    # 2. Run simulate_blender.py
    print("Running simulate_blender.py...")
    process = subprocess.Popen(
        [sys.executable, "simulate_blender.py", str(port)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # 3. Wait for simulation to finish or timeout
    try:
        # Give it some time to run the simulation
        # simulate_blender.py runs for about 10 seconds total based on its sleeps
        for _ in range(15):
            if process.poll() is not None:
                break
            await asyncio.sleep(1)
        
        if process.poll() is None:
            print("Simulation timed out, killing...")
            process.terminate()
    except Exception as e:
        print(f"Error during simulation: {e}")
        process.kill()

    # 4. Analyze results
    print("\n--- Integration Results ---")
    print(f"Total messages received: {len(received_messages)}")
    
    # With the new event model, we expect semantic event types like:
    # "file.saved", "editor.node.active", etc.
    # Check for any valid event types (they should have dot notation)
    received_types = {msg.get('type') for msg in received_messages}
    
    success = True
    
    # We expect at least some messages with the new normalized format
    # Events should have: type, payload, ts, source fields
    valid_events = [
        msg for msg in received_messages 
        if 'type' in msg and 'payload' in msg and 'ts' in msg
    ]
    
    if len(valid_events) == 0:
        print(f"FAIL: No valid events received with normalized format")
        print(f"Received types: {received_types}")
        success = False
    else:
        print(f"SUCCESS: Received {len(valid_events)} valid events")
        print(f"Event types: {received_types}")
    
    if len(received_messages) < 2:
        print(f"FAIL: Too few messages received ({len(received_messages)})")
        success = False

    if success:
        print("SUCCESS: Integration test passed!")
    
    server.close()
    await server.wait_closed()
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    import sys
    asyncio.run(test_integration())
