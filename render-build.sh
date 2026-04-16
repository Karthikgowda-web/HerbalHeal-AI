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
# Note: Render provides a python environment alongside node.
pip install numpy pillow tflite-runtime
