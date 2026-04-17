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
# Try tflite-runtime first (lightweight), fallback to tensorflow-cpu (heavy but compatible) if it fails
python3 -m pip install numpy pillow && \
(python3 -m pip install tflite-runtime || python3 -m pip install tensorflow-cpu)
