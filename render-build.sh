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
# Use tensorflow-cpu for full opcode support to avoid 'FULLY_CONNECTED' version mismatch
python3 -m pip install "numpy<2" pillow tensorflow-cpu


# Create/Sync Admin User & Seed Trilingual Data
echo "Syncing database..."
node backend/create_admin.js
node backend/seed_trilingual.js
