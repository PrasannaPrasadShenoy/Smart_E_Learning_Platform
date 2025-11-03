@echo off
echo Stopping all Docker services...
cd /d "%~dp0"
docker compose down
echo All services stopped.
pause


