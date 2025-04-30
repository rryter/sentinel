#!/bin/bash

echo "🚀 Starting Sentinel build process..."

# Navigate to backend directory and run build
echo "📦 Building backend..."
cd "$(dirname "$0")/sentinel-backend"
./build.sh
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi

# Navigate to frontend directory and run build
echo "🎨 Building frontend..."
cd ../sentinel-frontend
./build.sh
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Build completed successfully!"
