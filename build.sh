#!/usr/bin/env bash
set -e

echo "==> Installing root dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

echo "==> Installing client dependencies..."
cd client
npm install --legacy-peer-deps --no-audit --no-fund

echo "==> Building client (memory-limited)..."
NODE_OPTIONS="--max-old-space-size=400" npm run build

echo "==> Build complete!"
