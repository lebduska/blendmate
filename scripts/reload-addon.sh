#!/bin/bash
# Reload Blendmate addon via WebSocket
# Requires: websocat (brew install websocat)

WS_URL="${BLENDMATE_WS_URL:-ws://127.0.0.1:32123}"

# Check if websocat is installed
if ! command -v websocat &> /dev/null; then
    echo "Error: websocat not installed. Run: brew install websocat"
    exit 1
fi

# Send reload command
echo '{"type":"request","id":"reload-'$$'","action":"addon.reload","target":"","params":{}}' | websocat -n1 "$WS_URL"

echo "Reload command sent to Blender addon"
