param([string]$PythonPath)
$ErrorActionPreference = 'Stop'
try {
    $appName = 'R' + [char]0x014D + 'M'
    $appFolder = $PSScriptRoot
    $appFile = Join-Path $appFolder 'planner.py'
    $iconFile = Join-Path $appFolder 'web\travel-planner.ico'
    if (!(Test-Path -LiteralPath $appFile) -or !(Test-Path -LiteralPath $iconFile)) { throw 'Extract the whole application into its permanent folder first.' }
    if ([string]::IsNullOrWhiteSpace($PythonPath) -or !(Test-Path -LiteralPath $PythonPath)) { throw 'Run Install-Desktop-Shortcut.bat to supply your Python interpreter.' }
    $pythonWindowless = Join-Path (Split-Path -Parent $PythonPath) 'pythonw.exe'
    if (!(Test-Path -LiteralPath $pythonWindowless)) { throw 'pythonw.exe was not found. Repair your Python installation to enable silent startup.' }
    $localRoot = [Environment]::GetFolderPath('LocalApplicationData')
    if ([string]::IsNullOrWhiteSpace($localRoot)) { throw 'Windows did not provide a local application-data folder.' }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $folderHash = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($appFolder)))).Replace('-','').Substring(0,12)
    $localFolder = Join-Path $localRoot ('RoM\' + $folderHash)
    New-Item -ItemType Directory -Path $localFolder -Force | Out-Null
    $iconHash = (Get-FileHash -LiteralPath $iconFile -Algorithm SHA256).Hash.Substring(0,12)
    $localIcon = Join-Path $localFolder ('travel-' + $iconHash + '.ico')
    Copy-Item -LiteralPath $iconFile -Destination $localIcon -Force
    $encodedFolder = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($appFolder))
    $launcher = Join-Path $localFolder 'Launch-Travel.pyw'
    $launcherText = @"
import base64,ctypes,os,runpy,sys
from pathlib import Path
root=Path(base64.b64decode('$encodedFolder').decode('utf-8'))
try:
    if not (root/'planner.py').is_file():
        raise RuntimeError('The application folder is unavailable. Check your network connection and open the share in File Explorer. If the app moved, reinstall its shortcut.\n\n'+str(root))
    os.chdir(root)
    sys.path.insert(0,str(root))
except Exception as e:
    ctypes.windll.user32.MessageBoxW(0,str(e),'RoM could not start',16)
    sys.exit(1)
runpy.run_path(str(root/'planner.py'),run_name='__main__')
"@
    [IO.File]::WriteAllText($launcher,$launcherText,[Text.Encoding]::UTF8)
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut((Join-Path $desktop ($appName + '.lnk')))
    $shortcut.TargetPath = $pythonWindowless
    $shortcut.Arguments = '"' + $launcher + '"'
    $shortcut.WorkingDirectory = $localFolder
    $shortcut.IconLocation = $localIcon + ',0'
    $shortcut.Description = $appName + ' - offline trip planning'
    $shortcut.Save()
    Write-Host ($appName + ' desktop shortcut created.') -ForegroundColor Green
    Write-Host ('Application folder: ' + $appFolder)
    Write-Host 'Run this installer on each computer. Reinstall the shortcut if the application folder moves.'
} catch {
    Write-Host ('Shortcut was not created: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
