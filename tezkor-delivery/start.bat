@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem 3000-portdagi eski serverni o'chiradi
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000/admin.html"
node server.js
pause
