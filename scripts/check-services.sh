#!/bin/bash

echo "🔍 Checking AI Server Services Status"
echo "===================================="

# Main Server
echo "📡 Main Server (port 4000):"
if curl -s http://localhost:4000/health &>/dev/null; then
    echo "   ✅ ONLINE - http://localhost:4000"
    echo "   ✅ Health: $(curl -s http://localhost:4000/health)"
else
    echo "   ❌ OFFLINE - Start with: npm run dev"
fi

echo ""

# Inngest
echo "⚡ Inngest Server (port 8289):"
if curl -s http://localhost:8289 &>/dev/null; then
    echo "   ✅ ONLINE - http://localhost:8289"
    echo "   📊 Dashboard: http://localhost:8289"
else
    echo "   ❌ OFFLINE - Start with: npm run dev:inngest"
fi

echo ""

# MCP Server
echo "🤖 MCP Server:"
if pgrep -f "mcp/index.js" > /dev/null; then
    echo "   ✅ RUNNING - MCP server active"
else
    echo "   ❌ OFFLINE - Start with: npm run dev:mcp"
fi

echo ""
echo "🔗 Quick Links:"
echo "   Main API: http://localhost:4000"
echo "   Health Check: http://localhost:4000/health"
echo "   Inngest Dashboard: http://localhost:8289"
echo "   API Documentation: http://localhost:4000/api-docs"