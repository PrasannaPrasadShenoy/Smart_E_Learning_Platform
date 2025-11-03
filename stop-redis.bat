@echo off
echo Stopping Redis...
docker stop redis
docker rm redis
echo Redis stopped.
pause




