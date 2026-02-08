#!/bin/bash

# Function to kill child processes on exit
cleanup() {
    echo "Shutting down..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Apothokeep Backend and Frontend..."

# Start backend
cd server
npm run dev &
BACKEND_PID=$!

# Go back to root and start frontend
cd ..
npm run start &
FRONTEND_PID=$!

wait
