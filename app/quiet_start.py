from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parent
pythonw=Path(sys.executable).with_name('pythonw.exe')
if pythonw.exists():subprocess.Popen([str(pythonw),str(root/'planner.py')],cwd=root,creationflags=0x08000000)
else:subprocess.Popen([sys.executable,str(root/'planner.py')],cwd=root)
