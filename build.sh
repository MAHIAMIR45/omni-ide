#!/usr/bin/env bash
set -e

echo "==> Installing root dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

echo "==> Installing client dependencies (including devDeps for build)..."
cd client
npm install --include=dev --legacy-peer-deps --no-audit --no-fund

echo "==> Building client..."
NODE_OPTIONS="--max-old-space-size=400" ./node_modules/.bin/vite build

echo "==> Build complete!"
