@echo off
echo Stopping Amazon Market Intelligence service...
docker compose -f docker-compose-amazon.yml down
echo.
echo Amazon Market Intelligence service has been stopped
pause