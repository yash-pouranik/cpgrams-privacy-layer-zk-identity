#!/bin/bash

echo "==================================================="
echo "  Starting Privacy-Preserving CPGRAMS Services"
echo "==================================================:"
echo ""

# Start all three services in the background
(cd apps/sso-server && npm run dev) &
(cd apps/cpgrams-backend && npm run dev) &
(cd apps/frontend && npm run dev) &

echo "All 3 services launched in the background!"
echo "Frontend: http://localhost:3000"
echo "CivID SSO:   http://localhost:4000"
echo "Backend API: http://localhost:5000"
echo ""
echo "To stop all services, run: killall node"

# Keep the script running so background jobs stay alive
wait