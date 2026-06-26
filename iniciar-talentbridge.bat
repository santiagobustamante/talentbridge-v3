@echo off
title Iniciando TalentBridge V3
echo ===============================
echo   Iniciando TalentBridge V3...
echo ===============================

cd /d "C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3"

echo.
echo [1/4] Verificando Docker...
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker no esta corriendo. Abre Docker Desktop primero.
    echo.
    pause
    exit /b 1
)

echo [1/4] Encendiendo PostgreSQL V3...
cd /d "C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3"
docker compose -p version3 up -d postgres
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se pudo iniciar PostgreSQL con docker compose.
    pause
    exit /b 1
)
echo        PostgreSQL V3 listo (smart_portfolio_db_v3).

echo.
echo [2/4] Preparando Prisma...
cd /d "C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND"
call npx prisma generate
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] prisma generate fallo.
    pause
    exit /b 1
)
call npx prisma migrate deploy
echo        Prisma listo.

echo.
echo [3/4] Levantando microservicios backend...

start "API Gateway :3000" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo API Gateway :3000 && npx nest start api-gateway --watch"
timeout /t 2 /nobreak >nul

start "Auth Service :3001" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Auth Service :3001 && npx nest start auth-service --watch"
timeout /t 2 /nobreak >nul

start "Candidate Service :3002" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Candidate Service :3002 && npx nest start candidate-service --watch"
timeout /t 2 /nobreak >nul

start "Portfolio Service :3003" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Portfolio Service :3003 && npx nest start portfolio-service --watch"
timeout /t 2 /nobreak >nul

start "Company Service :3004" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Company Service :3004 && npx nest start company-service --watch"
timeout /t 2 /nobreak >nul

start "Jobs Service :3006" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Jobs Service :3006 && npx nest start jobs-service --watch"
timeout /t 2 /nobreak >nul

start "Applications :3007" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Applications :3007 && npx nest start applications-service --watch"
timeout /t 2 /nobreak >nul

start "Chat Service :3008" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Chat Service :3008 && npx nest start chat-service --watch"
timeout /t 2 /nobreak >nul

start "Assistant :3009" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Assistant :3009 && npx nest start assistant-service --watch"
timeout /t 2 /nobreak >nul

start "Dashboard :3010" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\BACKEND && echo Dashboard :3010 && npx nest start dashboard-service --watch"
echo        10 microservicios lanzados.

echo.
echo [4/4] Levantando frontend Angular...
start "Angular Frontend :4200" cmd /k "cd /d C:\Users\busta\Documents\UCC\SEMINARIO\PROYECTO\VERSION 3\FRONTEND && echo Angular Frontend :4200 && npm start"
echo        Frontend lanzado.

echo.
echo ===============================
echo   TalentBridge V3 INICIANDO...
echo ===============================
echo.
echo   Frontend : http://localhost:4200
echo   Swagger  : http://localhost:3000/api/docs
echo   Gateway  : http://localhost:3000
echo.
echo   Credenciales de prueba:
echo     Candidato: candidato001@demo.com / Candidato.123
echo     Empresa:  empresa001@demo.com  / Empresa.123
echo.
echo   Si es primera vez con esta base de datos,
echo   ejecuta manualmente:
echo     cd BACKEND ^&^& npx ts-node prisma/seed.ts
echo.
echo   Espera ~30 segundos a que todos los
echo   servicios compilen y esten listos.
echo.
echo   NO cierres las ventanas abiertas.
echo ===============================
echo.
pause
