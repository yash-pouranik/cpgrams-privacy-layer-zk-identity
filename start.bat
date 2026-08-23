@echo off
echo ===================================================
echo   Starting Privacy-Preserving CPGRAMS Services
echo ===================================================
echo.

start "CivID SSO Server (Port 4000)" cmd /k "cd apps\sso-server && npm run dev"
start "CPGRAMS Backend (Port 5000)" cmd /k "cd apps\cpgrams-backend && npm run dev"
start "Frontend UI (Port 3000)" cmd /k "cd apps\frontend && npm run dev"

echo All 3 services launched in separate windows!
echo Frontend: http://localhost:3000
echo.
