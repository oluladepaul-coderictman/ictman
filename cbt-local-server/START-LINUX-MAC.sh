#!/bin/bash
# CBT Bulldozer Local Server — Linux/Mac Launcher
# Run: chmod +x START-LINUX-MAC.sh && ./START-LINUX-MAC.sh

echo ""
echo "==========================================="
echo "  CBT BULLDOZER — Local Server Launcher    "
echo "==========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found! Install from: https://nodejs.org"
    exit 1
fi
echo "[OK] Node.js: $(node --version)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install deps if needed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo ""
    echo "[SETUP] Installing dependencies (one-time only)..."
    cd "$SCRIPT_DIR" && npm install
    echo "[OK] Dependencies ready!"
fi

# Get local IP
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
fi

PORT=${PORT:-3001}

echo ""
echo "==========================================="
echo "  SERVER STARTING...                       "
echo "==========================================="
echo ""
echo "  Local URL:    http://localhost:$PORT"
echo "  Network URL:  http://$LOCAL_IP:$PORT"
echo ""
echo "  On your phone APK, enter:"
echo "  http://$LOCAL_IP:$PORT"
echo ""
echo "  Keep this terminal OPEN to keep server running!"
echo "  Press Ctrl+C to stop."
echo "==========================================="
echo ""

cd "$SCRIPT_DIR"
node server.js
