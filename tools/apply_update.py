"""Verified program-only update with backup and rollback. No Data mutations."""
from pathlib import Path,PurePosixPath
import datetime,hashlib,json,os,shutil,sys,tempfile
from update_guard import gate
BASE=Path(__file__).resolve().parent
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(source,target):
 target.parent.mkdir(parents=True,exist_ok=True)
 fd,name=tempfile.mkstemp(prefix='.update-',dir=target.parent)
 try:
  with os.fdopen(fd,'wb') as f:f.write(source.read_bytes());f.flush();os.fsync(f.fileno())
  os.replace(name,target)
 finally:Path(name).unlink(missing_ok=True)
def install(target,base=BASE):
 target=Path(target).resolve();base=Path(base).resolve();m=json.loads((base/'UPDATE-MANIFEST.json').read_text())
 if target==base or target==base/'payload':raise RuntimeError('Choose the existing application folder, not the extracted update or payload folder.')
 if not (target/'planner.py').is_file() or not (target/'Start-App.bat').is_file():raise RuntimeError('This is not an installed application folder. Choose the folder containing Start-App.bat and Data.')
 if m['identity'] not in (target/'planner.py').read_text(encoding='utf-8'):raise RuntimeError('Wrong application. This update is for '+m['name']+'.')
 files=m['files']
 for name,h in files.items():
  parts=PurePosixPath(name).parts
  if not parts or any(x in ('.','..') for x in parts) or '\\' in name or ':' in name or name.startswith('/') or parts[0] not in m['allowed_roots'] or parts[0].lower()=='data':raise RuntimeError('Unsafe update path.')
  source=base/'payload'/name;dest=target/name
  if dest.resolve()!=dest or not dest.resolve().is_relative_to(target):raise RuntimeError('Destination points outside the application folder.')
  if digest(source)!=h:raise RuntimeError('Update file verification failed: '+name)
 with gate(target):
  if list((target/'.app-sessions').glob('*.json')):raise RuntimeError('The application is open, or a session marker remains after a crash. Use Exit on ALL computers. If markers remain, close all sessions before removing files inside .app-sessions.')
  backup=target/'App-Update-Backups'/datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f');backup.mkdir(parents=True)
  existed={name:(target/name).exists() for name in files}
  for name,yes in existed.items():
   if yes:
    b=backup/name;b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target/name,b)
    if digest(b)!=digest(target/name):raise RuntimeError('Backup verification failed. No program files replaced.')
  (backup/'RESTORE-MANIFEST.json').write_text(json.dumps({'existed':existed,'version':m['version']},indent=2))
  touched=[]
  try:
   for name,h in files.items():
    touched.append(name);atomic(base/'payload'/name,target/name)
    if digest(target/name)!=h:raise RuntimeError('Installed file verification failed: '+name)
  except Exception as e:
   failures=[]
   for name in reversed(touched):
    try:
     if existed[name]:atomic(backup/name,target/name)
     else:(target/name).unlink(missing_ok=True)
    except Exception:failures.append(name)
   if failures:raise RuntimeError('Update failed; recovery needed for '+', '.join(failures)+'. Keep the app closed. Program backup: '+str(backup)) from e
   raise RuntimeError('Update failed; previous program files restored. '+str(e)) from e
 return m,backup
def main():
 m=json.loads((BASE/'UPDATE-MANIFEST.json').read_text());print(m['name']+' update '+m['version'])
 print('Save your work and export a backup. Use Exit on BOTH computers. Do not open the app during the update.')
 print('Older versions cannot report open sessions; your confirmation is required for this first update.')
 if input('Are ALL copies closed? Type YES to continue: ').strip()!='YES':return
 try:
  import tkinter as tk
  from tkinter import filedialog
  ui=tk.Tk();ui.withdraw();folder=filedialog.askdirectory(title='Select the EXISTING '+m['name']+' folder',mustexist=True);ui.destroy()
 except Exception:folder=input('Paste the existing app folder path: ').strip().strip('"')
 if not folder:print('Cancelled.');return
 print('Destination: '+folder)
 if input('Apply update here? Type YES: ').strip()!='YES':return
 m,backup=install(folder);print('SUCCESS: '+m['name']+' '+m['version']+' installed.\nData and shortcuts were preserved.\nProgram backup: '+str(backup))
if __name__=='__main__':
 try:main()
 except Exception as e:print('Update was not completed: '+str(e));sys.exit(1)
