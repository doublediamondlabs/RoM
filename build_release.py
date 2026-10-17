"""Build clean release packages after verification; never enumerate user data."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parent
VERSION='0.1.8'
APP=['update_guard.py','planner.py','model.py','quiet_start.py','install_shortcut.py','Start-App.bat','Start-App-Diagnostics.bat','Install-Desktop-Shortcut.bat','Install-Desktop-Shortcut.ps1','web/index.html','web/domain.js','web/app.js','web/style.css','web/travel-planner.svg','web/travel-planner.ico']
SOURCE=['tools/apply_update.py','tools/Apply-Update.bat','tools/package_update.py','tests/test_updater.py','README.md','START-HERE.txt','docs/MAINTENANCE.md','docs/EXPENSE-BOOK-HANDOFF.md','.gitignore','.gitattributes','package.json','tests/test_planner.py','tests/test_shortcut.py','tests/domain.cjs','tests/ui.cjs','tests/handoff.cjs','tests/expenses.cjs','tests/inspection-transfer.json','tests/test_handoff.py','tests/handoff-ui.cjs','build_release.py']
PUBLIC_FILES=['docs/images/compare-options.png','docs/images/daily-plan.png','README.md', 'SUPPORT.md', 'CONTRIBUTING.md', 'THIRD-PARTY-NOTICES.md', 'RELEASE-NOTES.md', 'examples/weekend-demo.json', 'LICENSE', 'docs/licenses/jsdom-LICENSE.txt', 'docs/PUBLIC-RELEASE-REVIEW.md', 'docs/GITHUB-PUBLISHING.md', 'docs/SCREENSHOTS.md']
SOURCE += [p for p in PUBLIC_FILES+["package-lock.json"] if p not in SOURCE]
def build():
 for cmd in [[sys.executable,'-m','unittest','discover','-s','tests','-v'],['node','tests/domain.cjs'],['node','tests/ui.cjs'],['node','tests/handoff.cjs'],['node','tests/expenses.cjs'],['node','tests/handoff-ui.cjs']]:subprocess.run(cmd,cwd=ROOT,check=True)
 out=ROOT/'dist';out.mkdir(exist_ok=True)
 packages=[('RoM-v'+VERSION,[(ROOT/'app'/p,p) for p in APP]+[(ROOT/'START-HERE.txt','START-HERE.txt'),(ROOT/'docs/EXPENSE-BOOK-HANDOFF.md','EXPENSE-BOOK-HANDOFF.md')]+[(ROOT/p,p) for p in PUBLIC_FILES]),('RoM-Repository-v'+VERSION,[(ROOT/'app'/p,'app/'+p) for p in APP]+[(ROOT/p,p) for p in SOURCE])]
 for name,files in packages:
  inventory={}
  with zipfile.ZipFile(out/(name+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
   for source,target in files:
    raw=source.read_bytes()
    if target.endswith(('.bat','.ps1')):raw=raw.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
    z.writestr(name+'/'+target,raw);inventory[target]=hashlib.sha256(raw).hexdigest()
   z.writestr(name+'/RELEASE-MANIFEST.json',json.dumps({'version':VERSION,'files':inventory},indent=2))
  print(out/(name+'.zip'))
 sys.path.insert(0,str(ROOT/'tools'))
 from package_update import build_update
 build_update(ROOT,VERSION,APP,'RoM','RoM ')
if __name__=='__main__':build()
