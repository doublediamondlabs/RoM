"""RoM 0.1.9 — offline, standard-library runtime."""
import datetime as dt,hashlib,json,os,secrets,sys,tempfile,threading,webbrowser
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from model import empty,validate,UserError,pack,MAX_BYTES
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'Data'
TOKEN=secrets.token_urlsafe(32)
def read_state():
 p=DATA/'trips.json'
 if not p.exists():return empty(),'new'
 raw=p.read_bytes()
 try:s=json.loads(raw);validate(s)
 except Exception as e:raise UserError('Saved trips could not be read. Keep Data/trips.json and recover from a backup. '+str(e))
 return s,hashlib.sha256(raw).hexdigest()

def save_state(state,previous):
 validate(state);DATA.mkdir(parents=True,exist_ok=True);lock=DATA/'.saving.lock'
 try:fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
 except FileExistsError:raise UserError('Another window is saving. Retry shortly. If it persists, close both planners and see START-HERE.txt for lock recovery.')
 temp=None
 try:
  os.write(fd,str(os.getpid()).encode());os.close(fd)
  _,revision=read_state()
  if previous!=revision:raise UserError('Changes were saved in another window. Your unsaved work is still on screen. Export Current Copy before reloading, then reapply your change.')
  target=DATA/'trips.json'
  if target.exists():
   backups=DATA/'Backups';backups.mkdir(exist_ok=True)
   stamp=dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f')
   (backups/(stamp+'.json')).write_bytes(target.read_bytes())
  f=tempfile.NamedTemporaryFile(dir=DATA,prefix='.trips-',suffix='.tmp',delete=False);temp=Path(f.name)
  raw=pack(state)
  with f:f.write(raw);f.flush();os.fsync(f.fileno())
  os.replace(temp,target);temp=None
  for old in sorted((DATA/'Backups').glob('*.json'))[:-10]:
   try:old.unlink()
   except OSError:pass # A locked old backup must not turn a completed save into a failure.
  return hashlib.sha256(raw).hexdigest()
 finally:
  if temp:
   try:temp.unlink()
   except OSError:pass
  try:lock.unlink(missing_ok=True)
  except OSError:pass

class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def send(self,code,body,kind='application/json'):
  raw=pack(body) if kind=='application/json' else body
  self.send_response(code);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(raw)
 def allowed(self):return self.headers.get('Host') in [f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}']
 def do_GET(self):
  if not self.allowed():return self.send(403,{'error':'Local access only.'})
  if self.path=='/api/state':
   try:s,r=read_state();return self.send(200,{'state':s,'revision':r,'token':TOKEN})
   except Exception as e:return self.send(500,{'error':str(e)})
  files={'/domain.js':('domain.js','text/javascript; charset=utf-8'),'/travel-planner.ico':('travel-planner.ico','image/x-icon'),'/travel-planner.svg':('travel-planner.svg','image/svg+xml'),'/':('index.html','text/html; charset=utf-8'),'/app.js':('app.js','text/javascript; charset=utf-8'),'/style.css':('style.css','text/css; charset=utf-8')}
  if self.path not in files:return self.send(404,{'error':'Not found'})
  name,kind=files[self.path];self.send(200,(ROOT/'web'/name).read_bytes(),kind)
 def do_POST(self):
  if not self.allowed() or self.headers.get('X-Planner-Token')!=TOKEN:return self.send(403,{'error':'Reload this local application before saving.'})
  try:
   length=int(self.headers.get('Content-Length','0'))
   if not 0<length<=MAX_BYTES*2:raise UserError('Request too large or empty.')
   body=json.loads(self.rfile.read(length))
   if self.path=='/api/save':return self.send(200,{'revision':save_state(body['state'],body['previous'])})
   if self.path=='/api/validate':validate(body['state']);return self.send(200,{'ok':True})
   if self.path=='/api/exit':
    self.send(200,{'ok':True});threading.Thread(target=self.server.shutdown,daemon=True).start();return
   self.send(404,{'error':'Not found'})
  except OSError as e:self.send(400,{'error':'The file could not be saved or accessed. Check the network share, folder permissions and free space. Your edits remain on screen; Export Current Copy before reloading. Details: '+str(e)})
  except Exception as e:self.send(400,{'error':str(e)})

def serve():
 DATA.mkdir(parents=True,exist_ok=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
 url=f'http://127.0.0.1:{server.server_port}'
 print('RoM 0.1.9\n'+url+'\nKeep this diagnostics window open while using the planner.')
 webbrowser.open(url);server.serve_forever();server.server_close()
def main():
 from update_guard import session
 with session(ROOT):serve()
if __name__=='__main__':
 try:main()
 except Exception as e:
  try:(ROOT/'startup-error.txt').write_text(str(e),encoding='utf-8')
  except OSError:pass
  if os.name=='nt':
   import ctypes;ctypes.windll.user32.MessageBoxW(0,'RoM could not start. Check the share connection and folder permissions.\n\n'+str(e),'RoM',16)
  else:print(str(e),file=sys.stderr)
  raise