"""Shared-folder startup/update coordination. Stale markers block safely."""
from pathlib import Path
from contextlib import contextmanager
import os,socket,uuid,json
@contextmanager
def gate(root):
 p=Path(root)/'.app-update.lock'
 try:fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL)
 except FileExistsError:raise RuntimeError('An update or startup is already in progress. If this persists after a crash, close the app on ALL computers before removing .app-update.lock.')
 try:
  os.write(fd,json.dumps({'computer':socket.gethostname(),'pid':os.getpid()}).encode());os.close(fd)
  yield
 finally:p.unlink(missing_ok=True)
@contextmanager
def session(root):
 marker=None
 with gate(root):
  folder=Path(root)/'.app-sessions';folder.mkdir(exist_ok=True)
  marker=folder/(uuid.uuid4().hex+'.json');marker.write_text(json.dumps({'computer':socket.gethostname(),'pid':os.getpid()}))
 try:yield
 finally:
  if marker:marker.unlink(missing_ok=True)
