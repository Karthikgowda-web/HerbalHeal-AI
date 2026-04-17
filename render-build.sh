#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Node dependencies for backend
npm install

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
python3 -m pip install numpy pillow tflite-runtime
