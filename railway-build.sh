#!/bin/bash
# Railway build script to install Python dependencies for TTS service

echo "Installing Python dependencies for TTS..."
cd backend/python_services
pip install -r requirements.txt
cd ../..

echo "Installing Node dependencies..."
cd backend
npm install
cd ..

echo "Build complete!"
