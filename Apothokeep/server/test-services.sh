#!/bin/bash

# Test script for microservices
echo "🧪 Testing Apothokeep Microservices..."
echo ""

cd "/Users/computationalmind/Desktop/Spring 2026/ugahacks/workspace/UGAHACKS11/Apothokeep/server"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Test 1: Check TypeScript compilation
echo "1️⃣  Testing TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    echo "   ❌ TypeScript compilation failed"
    exit 1
else
    echo "   ✅ TypeScript compilation passed"
fi

# Test 2: Try to start barcode service
echo ""
echo "2️⃣  Testing Barcode Service startup..."
npm run start:barcode > /tmp/barcode-test.log 2>&1 &
BARCODE_PID=$!
sleep 2

if ps -p $BARCODE_PID > /dev/null; then
    echo "   ✅ Barcode Service started successfully (PID: $BARCODE_PID)"
    kill $BARCODE_PID 2>/dev/null
    wait $BARCODE_PID 2>/dev/null
else
    echo "   ❌ Barcode Service failed to start"
    cat /tmp/barcode-test.log
    exit 1
fi

# Test 3: Try to start API service
echo ""
echo "3️⃣  Testing API Service startup..."
npm run start:api > /tmp/api-test.log 2>&1 &
API_PID=$!
sleep 2

if ps -p $API_PID > /dev/null; then
    echo "   ✅ API Service started successfully (PID: $API_PID)"
    kill $API_PID 2>/dev/null
    wait $API_PID 2>/dev/null
else
    echo "   ❌ API Service failed to start"
    cat /tmp/api-test.log
    exit 1
fi

echo ""
echo "✅ All tests passed! Services are ready to run."
echo ""
echo "To start the services, run:"
echo "  ./start-services.sh"
echo "  or"
echo "  npm run start:all"
