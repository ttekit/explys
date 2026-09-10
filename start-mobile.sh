#!/bin/sh

echo "Starting backend and mobile..."

# Run both in the background
(cd backend && npm run dev) &
BACKEND_PID=$!

(cd mobile && npm run start) &
MOBILE_PID=$!

# Clean up processes on exit
trap "echo 'Shutting down...'; kill $BACKEND_PID $MOBILE_PID" EXIT INT TERM

# Wait for services to start, then open the Simulator and API Docs
sleep 3
open -a Simulator || true
open http://localhost:4200/api || true

# Wait for both processes
wait
