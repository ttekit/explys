#!/bin/sh

echo "Starting backend and frontend..."

# Run both in the background
(cd backend && npm run dev) &
BACKEND_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Clean up processes on exit
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID" EXIT INT TERM

# Wait for services to start, then open the browser
sleep 3
open http://localhost:5173

# Wait for both processes
wait
