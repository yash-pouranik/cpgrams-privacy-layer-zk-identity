#!/bin/bash

echo "==================================================="
echo "  Privacy-Preserving CPGRAMS - Setup & Launcher"
echo "==================================================^"
echo ""

echo "[1/4] Installing root and workspace dependencies..."
npm install

echo ""
echo "[2/4] Generating Prisma Client for CivID SSO..."
cd apps/sso-server
npx prisma generate
cd ../..

echo ""
echo "[3/4] Seeding CPGRAMS Backend (MongoDB mock officers)..."
cd apps/cpgrams-backend
npm run seed
cd ../..

echo ""
echo "[4/4] Launching all 3 microservices..."
echo "Tip: You can run these in separate VS Code terminal tabs/splits using the commands below."
echo ""

# Option A: Run them concurrently in the background and stream logs to terminal
# (Uncomment the lines below if you want them to run all in this single terminal tab)
# (cd apps/sso-server && npm run dev) &
# (cd apps/cpgrams-backend && npm run dev) &
# (cd apps/frontend && npm run dev) &
# wait

echo "================================================ ==="
echo "  Setup Complete!"
echo "  Frontend UI: http://localhost:3000"
echo "  CivID SSO:   http://localhost:4000"
echo "  Backend API: http://localhost:5000"
echo "================================================ ==="