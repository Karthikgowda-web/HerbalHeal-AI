#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Node dependencies for root and backend
npm install
cd backend
npm install
cd ..

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Materialize build for Vercel/Root serving
mkdir -p dist
cp -rv frontend/dist/* dist/

# Install Python dependencies for AI Model
echo "Checking Python version..."
python3 --version

echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip
# Use lightweight tflite-runtime instead of heavy tensorflow for 10x faster startup on Render
python3 -m pip install numpy pillow tflite-runtime


# Create/Sync Admin User
echo "Syncing admin credentials..."
node backend/create_admin.js
