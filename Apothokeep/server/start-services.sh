#!/bin/bash

# Start microservices for Apothokeep
# This script starts both the main API server and the barcode WebSocket service

echo "🚀 Starting Apothokeep Microservices..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Please create a .env file with the following variables:"
    echo "   - MONGODB_URI"
    echo "   - GEMINI_API_KEY"
    echo "   - PORT (optional, defaults to 3000)"
    echo "   - WS_PORT (optional, defaults to 8080)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping microservices..."
    kill $API_PID $BARCODE_PID 2>/dev/null
    wait $API_PID $BARCODE_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start API server in background
echo "📡 Starting API server..."
npx ts-node server.ts &
API_PID=$!
echo "   API Server PID: $API_PID"

# Wait a moment
sleep 1

# Start Barcode WebSocket service in background
echo "🔍 Starting Barcode WebSocket service..."
npx ts-node microservices/barcodeService.ts &
BARCODE_PID=$!
echo "   Barcode Service PID: $BARCODE_PID"

echo ""
echo "✅ All microservices started!"
echo ""
echo "Services running:"
echo "  - API Server: http://localhost:${PORT:-3000}"
echo "  - Barcode WebSocket: ws://localhost:${WS_PORT:-8080}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $API_PID $BARCODE_PID
