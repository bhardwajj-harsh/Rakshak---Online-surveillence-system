#!/usr/bin/env bash
# Start the FastAPI backend server

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

echo "Starting RAKSHAK backend on http://localhost:8000"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
