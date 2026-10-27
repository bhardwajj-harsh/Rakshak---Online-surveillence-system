#!/usr/bin/env bash
# Start the React frontend development server

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

echo "Starting RAKSHAK frontend on http://localhost:5173"
npm run dev
