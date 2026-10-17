import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from install_shortcut import shortcut_command

class ShortcutTests(unittest.TestCase):
 def test_interpreter_and_paths_passed_as_separate_arguments(self):
  with tempfile.TemporaryDirectory(prefix='RōM ') as tmp:
   root=Path(tmp);(root/'web').mkdir()
   for name in ['planner.py','Install-Desktop-Shortcut.ps1','web/travel-planner.ico','python.exe']:
    (root/name).touch()
   cmd=shortcut_command(root,str(root/'python.exe'))
   self.assertEqual(cmd[-2:],['-PythonPath',str(root/'python.exe')])
   self.assertEqual(cmd[cmd.index('-File')+1],str(root/'Install-Desktop-Shortcut.ps1'))
   self.assertNotIn('-c',cmd)
 def test_missing_interpreter_is_explained(self):
  with self.assertRaisesRegex(RuntimeError,'executable path'):shortcut_command('.',None)
 def test_missing_package_is_explained(self):
  with tempfile.TemporaryDirectory() as tmp:
   with self.assertRaisesRegex(RuntimeError,'Extract the full application'):shortcut_command(tmp,sys.executable)
