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
    
    expected_types = {'event', 'context'}
    received_types = {msg.get('type') for msg in received_messages}
    
    success = True
    if not expected_types.issubset(received_types):
        print(f"FAIL: Missing expected message types. Expected {expected_types}, got {received_types}")
        success = False
    
    if len(received_messages) < 3:
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
