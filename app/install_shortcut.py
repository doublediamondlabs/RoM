"""Pass the running interpreter directly; do not parse a PowerShell Python probe."""
from pathlib import Path
import subprocess
import sys

def shortcut_command(root, executable):
    root = Path(root).resolve()
    if not executable:
        raise RuntimeError('Python did not provide its executable path.')
    python = Path(executable)
    if not python.is_file():
        raise RuntimeError('The running Python executable could not be found: '+str(python))
    for name in ['planner.py', 'Install-Desktop-Shortcut.ps1', 'web/travel-planner.ico']:
        if not (root/name).is_file():
            raise RuntimeError('Missing '+name+'. Extract the full application before installing its shortcut.')
    return ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass',
            '-File', str(root/'Install-Desktop-Shortcut.ps1'), '-PythonPath', str(python)]

def main():
    try:
        if sys.version_info < (3,10):
            raise RuntimeError('Python 3.10 or newer is required.')
        command = shortcut_command(Path(__file__).parent, sys.executable)
        return subprocess.run(command, check=False).returncode
    except Exception as exc:
        print('Shortcut was not created: '+str(exc))
        return 1

if __name__ == '__main__':
    sys.exit(main())
