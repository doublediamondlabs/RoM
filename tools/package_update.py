from pathlib import Path
import hashlib,json,zipfile
def build_update(root,version,app,prefix,identity):
 root=Path(root);name=prefix+'-Update-v'+version;files=[(root/'app'/p,p) for p in app]+[(root/'START-HERE.txt','START-HERE.txt')]
 files += [(root/p,p) for p in ['docs/images/compare-options.png','docs/images/daily-plan.png','README.md','SUPPORT.md','THIRD-PARTY-NOTICES.md','RELEASE-NOTES.md','examples/weekend-demo.json','LICENSE','docs/licenses/jsdom-LICENSE.txt','docs/PUBLIC-RELEASE-REVIEW.md'] if (root/p).is_file()]
 manifest={'name':prefix,'version':version,'identity':identity,'allowed_roots':sorted({p.split('/')[0] for _,p in files}),'files':{}}
 with zipfile.ZipFile(root/'dist'/(name+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
  for source,target in files:
   data=source.read_bytes()
   if target.endswith(('.bat','.ps1')):data=data.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
   z.writestr(name+'/payload/'+target,data);manifest['files'][target]=hashlib.sha256(data).hexdigest()
  for p in ['apply_update.py','Apply-Update.bat']:
   data=(root/'tools'/p).read_bytes()
   if p.endswith('.bat'):data=data.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
   z.writestr(name+'/'+p,data)
  z.write(root/'app/update_guard.py',name+'/update_guard.py')
  z.writestr(name+'/UPDATE-MANIFEST.json',json.dumps(manifest,indent=2))
  z.writestr(name+'/READ-ME.txt','Save/export a backup and Exit on ALL computers. Run Apply-Update.bat.\nSelect your EXISTING app folder (contains Start-App.bat and Data).\nDo not select this update folder or payload. Data is not replaced.\nProgram backups are in App-Update-Backups inside the app folder.\nIf rollback fails, keep the app closed and recover program files from that backup.\n')
 print(root/'dist'/(name+'.zip'))
