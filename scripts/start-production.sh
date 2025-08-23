#!/bin/bash

# Production startup script for AI Server + N8N
echo "🚀 Starting AI Server + N8N in Production Mode"
echo "==============================================="

# Set default environment variables for N8N
export N8N_USER_MANAGEMENT_DISABLED=${N8N_USER_MANAGEMENT_DISABLED:-true}
export N8N_PERSONALIZATION_ENABLED=${N8N_PERSONALIZATION_ENABLED:-false}  
export N8N_HOST=${N8N_HOST:-localhost}
export N8N_PORT=${N8N_PORT:-5678}
export N8N_PROTOCOL=${N8N_PROTOCOL:-http}
export N8N_SECURE_COOKIE=${N8N_SECURE_COOKIE:-false}
export N8N_BASIC_AUTH_ACTIVE=${N8N_BASIC_AUTH_ACTIVE:-true}
export N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER:-admin}
export N8N_BASIC_AUTH_PASSWORD=${N8N_ADMIN_PASSWORD:-admin123}
export N8N_PATH=${N8N_PATH:-/n8n}
export N8N_SERVE_STATIC=${N8N_SERVE_STATIC:-true}
export GENERIC_TIMEZONE=${GENERIC_TIMEZONE:-Europe/Moscow}
export N8N_METRICS=${N8N_METRICS:-true}
export N8N_LOG_LEVEL=${N8N_LOG_LEVEL:-info}

echo "📊 Environment:"
echo "  - AI Server Port: ${PORT:-3000}"
echo "  - N8N Port: ${N8N_PORT}"
echo "  - N8N Path: ${N8N_PATH}"
echo "  - Log Level: ${N8N_LOG_LEVEL}"

# Create N8N config directory
mkdir -p ~/.n8n

# Function to handle shutdown gracefully
cleanup() {
    echo ""
    echo "🛑 Shutting down services gracefully..."
    kill -TERM $AI_PID $N8N_PID 2>/dev/null
    wait $AI_PID $N8N_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo ""
echo "🤖 Starting AI Server..."
# Start AI Server in background
node dist/server.js &
AI_PID=$!

echo "⏳ Waiting 5 seconds for AI Server to initialize..."
sleep 5

echo ""
echo "🎨 Starting N8N Server..."
# Start N8N in background
n8n start &
N8N_PID=$!

echo ""
echo "✅ Both services started:"
echo "  - AI Server PID: $AI_PID"
echo "  - N8N Server PID: $N8N_PID"
echo ""
echo "🌐 Services will be available at:"
echo "  - AI Server: http://localhost:${PORT:-3000}"
echo "  - N8N (via proxy): http://localhost:${PORT:-3000}/n8n"
echo "  - N8N (direct): http://localhost:${N8N_PORT}"
echo ""
echo "🏃 Running in production mode. Press Ctrl+C to stop."

# Wait for both processes
wait $AI_PID $N8N_PID