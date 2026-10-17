@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 goto folder_error
where py >nul 2>nul
if not errorlevel 1 (
 py -3 "%~dp0apply_update.py"
) else (
 python "%~dp0apply_update.py"
)
popd
pause
exit /b
:folder_error
echo Cannot open the update folder. Check the network connection and permissions.
pause
