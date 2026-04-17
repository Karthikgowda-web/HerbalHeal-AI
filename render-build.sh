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
# Prioritize tensorflow-cpu to support latest model opcodes (like FULLY_CONNECTED v12)
python3 -m pip install numpy pillow tensorflow-cpu

# Create/Sync Admin User
echo "Syncing admin credentials..."
node backend/create_admin.js
