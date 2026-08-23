@echo off
echo ===================================================
echo   Privacy-Preserving CPGRAMS - Setup ^& Launcher
echo ===================================================
echo.

echo [1/4] Installing root and workspace dependencies...
call npm install

echo.
echo [2/4] Generating Prisma Client for CivID SSO...
cd apps\sso-server
call npx prisma generate
cd ..\..

echo.
echo [3/4] Seeding CPGRAMS Backend (MongoDB mock officers)...
cd apps\cpgrams-backend
call npm run seed
cd ..\..

echo.
echo [4/4] Launching all 3 microservices in parallel windows...
echo - Starting CivID SSO Server (Port 4000)...
start "CivID SSO Server (Port 4000)" cmd /k "cd apps\sso-server && npm run dev"

echo - Starting CPGRAMS Backend (Port 5000)...
start "CPGRAMS Backend (Port 5000)" cmd /k "cd apps\cpgrams-backend && npm run dev"

echo - Starting Frontend App (Port 3000)...
start "Frontend App (Port 3000)" cmd /k "cd apps\frontend && npm run dev"

echo.
echo ===================================================
echo   Setup Complete! All services are starting up.
echo   Frontend UI: http://localhost:3000
echo   CivID SSO:   http://localhost:4000
echo   Backend API: http://localhost:5000
echo ===================================================
pause
