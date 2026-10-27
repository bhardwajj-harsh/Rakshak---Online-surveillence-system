#!/usr/bin/env bash
# Start both backend and frontend development servers

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== RAKSHAK Development Server ==="
echo "Root: $ROOT_DIR"
echo ""

# Start backend
echo "Starting backend on http://localhost:8000 ..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on http://localhost:5173 ..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

npm run dev &
FRONTEND_PID=$!

echo ""
echo "=== RAKSHAK is running ==="
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/api/health"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
