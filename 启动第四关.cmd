@echo off
setlocal
cd /d "%~dp0"
node "tools\launch-game.cjs" --level=4 %*
if errorlevel 1 pause
endlocal
