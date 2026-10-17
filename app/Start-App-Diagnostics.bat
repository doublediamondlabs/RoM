@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 goto folder_error
where py >nul 2>nul
if not errorlevel 1 (
 py -3 "%~dp0planner.py"
) else (
 python "%~dp0planner.py"
)
if errorlevel 1 pause
popd
exit /b
:folder_error
echo Cannot open the planner folder. Check the network share connection.
pause
