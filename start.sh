#!/bin/bash
# BookBrain — Quick start script
set -e

echo "📚 BookBrain — Starting..."
echo ""

# 1. Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3.11+ is required."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required for ChromaDB."; exit 1; }

echo "✅ Prerequisites OK"
echo ""

# 2. Start ChromaDB
echo "🐳 Starting ChromaDB..."
docker compose up -d chromadb
sleep 2

# 3. Install dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --silent
cp -n .env.example .env 2>/dev/null || true
cd ..

echo "📦 Installing Python dependencies..."
pip install -r backend/requirements.txt --break-system-packages -q

echo "📦 Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# 4. Create library folder
mkdir -p library
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy your EPUBs/PDFs into ./library/"
echo "  2. Run: cd backend && python3 scripts/ingest.py --input ../library"
echo "  3. Terminal 1: cd backend && npm run dev"
echo "  4. Terminal 2: cd frontend && ng serve"
echo "  5. Open http://localhost:4200"
echo ""
echo "Optional: install Ollama (https://ollama.ai) then:"
echo "  ollama pull mistral"
echo "  ollama serve"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
