@echo off
setlocal
cd /d "%~dp0"
node "tools\launch-game.cjs" %*
if errorlevel 1 (
  echo.
  echo Please check that Node.js is installed and review the error above.
  pause
  endlocal
  exit /b 1
)
endlocal
exit /b 0
