#!/bin/bash

echo "🔍 Moneta Deployment Checker"
echo "=============================="
echo ""

# Check Railway Backend
echo "📡 Testing Railway Backend..."
read -p "Enter your Railway URL (e.g., https://hacknc-production.up.railway.app): " RAILWAY_URL

if [ ! -z "$RAILWAY_URL" ]; then
    echo "Testing $RAILWAY_URL..."
    
    # Test root endpoint
    echo "  → Testing root endpoint..."
    curl -s -o /dev/null -w "  Status: %{http_code}\n" "$RAILWAY_URL/" || echo "  ❌ Failed to connect"
    
    # Test health endpoint
    echo "  → Testing health endpoint..."
    curl -s -o /dev/null -w "  Status: %{http_code}\n" "$RAILWAY_URL/health" || echo "  ❌ Failed to connect"
    
    # Test CORS
    echo "  → Testing CORS..."
    curl -s -H "Origin: https://your-app.vercel.app" \
         -H "Access-Control-Request-Method: POST" \
         -H "Access-Control-Request-Headers: Content-Type" \
         -X OPTIONS "$RAILWAY_URL/auth/login" -o /dev/null -w "  CORS Status: %{http_code}\n"
    
    echo ""
    echo "✅ Backend URL for Vercel: $RAILWAY_URL"
    echo "   Add this as NEXT_PUBLIC_API_URL in Vercel environment variables"
else
    echo "⚠️  Skipped backend check"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Copy your Railway URL (without trailing slash)"
echo "2. In Vercel, set: NEXT_PUBLIC_API_URL=<your-railway-url>"
echo "3. In Railway, set: ALLOWED_ORIGINS=<your-vercel-url>"
echo "4. Redeploy both services"

