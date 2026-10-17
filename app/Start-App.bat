@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 goto folder_error
where py >nul 2>nul
if not errorlevel 1 (
 py -3 "%~dp0quiet_start.py"
) else (
 python "%~dp0quiet_start.py"
)
if errorlevel 1 (
 echo Could not start RoM. Install Python 3.10 or newer and enable Add Python to PATH.
 pause
)
popd
exit /b
:folder_error
echo Cannot open the planner folder. Check the network share connection and folder permissions.
pause
