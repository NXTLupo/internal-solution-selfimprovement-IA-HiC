@echo off
echo Starting Amazon Market Intelligence service...
docker compose -f docker-compose-amazon.yml up -d
echo.
echo Amazon Market Intelligence service is running at http://localhost:5010
pause