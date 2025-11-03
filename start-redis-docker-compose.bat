@echo off
echo Starting Redis using docker-compose...
cd /d "%~dp0"
docker compose up redis -d
echo.
echo Checking Redis status...
docker ps | findstr redis
echo.
echo Redis is running! You can now start your server with: npm start
pause


