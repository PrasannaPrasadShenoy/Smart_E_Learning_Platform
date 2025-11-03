@echo off
echo Starting Redis in WSL...
echo.
echo Checking WSL...
wsl --status
echo.
echo Installing and starting Redis in WSL...
wsl bash -c "sudo apt update && sudo apt install -y redis-server && sudo service redis-server start"
echo.
echo Redis should now be running in WSL on localhost:6379
echo.
pause

