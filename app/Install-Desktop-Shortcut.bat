@echo off
setlocal
where py >nul 2>nul
if not errorlevel 1 (
 py -3 "%~dp0install_shortcut.py"
) else (
 python "%~dp0install_shortcut.py"
)
if errorlevel 1 echo Shortcut installation did not complete. See the message above.
echo.
pause
