#!/bin/bash

# Content Factory - Quick Start Script
# This script helps you set up Content Factory quickly

set -e

echo "Content Factory - Quick Start Setup"
echo "======================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[FAIL] Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "[FAIL] Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "[OK] Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "[OK] .env file created"
    echo ""
    echo "[IMPORTANT] You need to configure the following in .env:"
    echo "   1. SUPABASE_URL - Your Supabase project URL"
    echo "   2. SUPABASE_ANON_KEY - Your Supabase anonymous key"
    echo "   3. GEMINI_API_KEY - Your Google Gemini API key"
    echo ""
    echo "Get your Gemini API key here: https://aistudio.google.com/app/apikey"
    echo ""
    read -p "Press Enter when you've updated .env with your credentials..."
else
    echo "[OK] .env file already exists"
fi

# Check if client/.env.local exists
if [ ! -f client/.env.local ]; then
    echo "Creating client/.env.local..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > client/.env.local
    echo "[OK] client/.env.local created"
fi

echo ""
echo "Installing backend dependencies..."
npm install

echo ""
echo "Installing frontend dependencies..."
cd client
npm install
cd ..

echo ""
echo "Starting Docker services..."
echo "   - Redis"
echo "   - API Server"
echo "   - Worker Process"
echo "   - Frontend"
echo ""

docker-compose up -d

echo ""
echo "Waiting for services to start..."
sleep 10

echo ""
echo "Checking service health..."

# Check API health
if curl -s http://localhost:3001/health > /dev/null; then
    echo "[OK] API Server is running on http://localhost:3001"
else
    echo "[WARN] API Server might still be starting..."
fi

# Check if frontend is accessible
if curl -s http://localhost:3000 > /dev/null; then
    echo "[OK] Frontend is running on http://localhost:3000"
else
    echo "[WARN] Frontend might still be starting..."
fi

echo ""
echo "Content Factory is ready!"
echo ""
echo "Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo ""
echo "View logs:"
echo "   docker-compose logs -f"
echo ""
echo "Stop services:"
echo "   docker-compose down"
echo ""
