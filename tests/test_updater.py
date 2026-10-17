import importlib.util,sys,tempfile,json,hashlib,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'app'));sys.path.insert(0,str(ROOT/'tools'))
import apply_update as u
from update_guard import session
class Updates(unittest.TestCase):
 def test_install_protection_and_rollback(self):
  with tempfile.TemporaryDirectory() as folder:
   base=Path(folder)/'update';target=Path(folder)/'live';(base/'payload/web').mkdir(parents=True);(target/'Data').mkdir(parents=True)
   (target/'planner.py').write_text('Synthetic planner old');(target/'Start-App.bat').write_text('old launcher');(target/'Data/trips.json').write_bytes(b'KEEP DATA');(base/'payload/planner.py').write_text('Synthetic planner new');(base/'payload/web/app.js').write_text('new frontend')
   files={'planner.py':u.digest(base/'payload/planner.py'),'web/app.js':u.digest(base/'payload/web/app.js')}
   manifest={'identity':'Synthetic planner','name':'Synthetic','version':'2','allowed_roots':['planner.py','web'],'files':files};(base/'UPDATE-MANIFEST.json').write_text(json.dumps(manifest))
   with session(target):
    with self.assertRaisesRegex(RuntimeError,'open'):u.install(target,base)
   self.assertEqual((target/'planner.py').read_text(),'Synthetic planner old')
   original=u.atomic
   def fail(src,dst):
    if src==base/'payload/web/app.js':raise OSError('synthetic write failure')
    original(src,dst)
   with patch.object(u,'atomic',side_effect=fail):
    with self.assertRaisesRegex(RuntimeError,'restored'):u.install(target,base)
   self.assertEqual((target/'planner.py').read_text(),'Synthetic planner old');self.assertFalse((target/'web/app.js').exists())
   m,backup=u.install(target,base);self.assertEqual((target/'planner.py').read_text(),'Synthetic planner new');self.assertEqual((backup/'planner.py').read_text(),'Synthetic planner old');self.assertEqual((target/'Data/trips.json').read_bytes(),b'KEEP DATA')
   (base/'payload/planner.py').write_text('tampered')
   with self.assertRaisesRegex(RuntimeError,'verification'):u.install(target,base)
   self.assertFalse((target/'.app-update.lock').exists())
   (target/'planner.py').write_text('Another app')
   with self.assertRaisesRegex(RuntimeError,'Wrong application'):u.install(target,base)
if __name__=='__main__':unittest.main()
