import copy,json,sys,tempfile,threading,unittest,urllib.request,urllib.error,subprocess
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
import planner
from model import validate,UserError,empty
class PlannerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.patch=patch.object(planner,'DATA',Path(self.tmp.name));self.patch.start()
 def tearDown(self):self.patch.stop();self.tmp.cleanup()
 def test_optional_fuel_allowance(self):
  s=empty();self.assertEqual(s['defaults']['fuelAllowance'],.1)
  del s['defaults']['fuelAllowance'];validate(s)
  s['defaults']['fuelAllowance']=.25;validate(s)
  s['defaults']['fuelAllowance']=-1
  with self.assertRaises(UserError):validate(s)
 def test_optional_checklist_preference(self):
  s=empty();self.assertFalse(s['defaults']['checklistEnabled']);validate(s)
  del s['defaults']['checklistEnabled'];validate(s)
  s['defaults']['checklistEnabled']=True;r=planner.save_state(s,'new')
  self.assertTrue(planner.read_state()[0]['defaults']['checklistEnabled'])
  s['defaults']['checklistEnabled']='yes'
  with self.assertRaises(UserError):validate(s)
 def test_atomic_save_conflict_and_retention(self):
  s,r=planner.read_state();r=planner.save_state(s,r)
  original=(planner.DATA/'trips.json').read_bytes()
  with self.assertRaisesRegex(UserError,'another window'):planner.save_state(s,'new')
  self.assertEqual(original,(planner.DATA/'trips.json').read_bytes())
  for i in range(14):s['defaults']['preferences']=str(i);r=planner.save_state(s,r)
  self.assertEqual(len(list((planner.DATA/'Backups').glob('*.json'))),10)
  self.assertEqual(planner.read_state()[0]['defaults']['preferences'],'13')
 def test_failed_replace_keeps_prior_data(self):
  s,r=planner.read_state();r=planner.save_state(s,r);old=(planner.DATA/'trips.json').read_bytes();s['defaults']['preferences']='new'
  with patch.object(planner.os,'replace',side_effect=PermissionError('Access denied')):
   with self.assertRaises(PermissionError):planner.save_state(s,r)
  self.assertEqual(old,(planner.DATA/'trips.json').read_bytes());self.assertFalse((planner.DATA/'.saving.lock').exists())
 def test_lock_and_corrupt_state_protected(self):
  s,r=planner.read_state();(planner.DATA/'.saving.lock').touch()
  with self.assertRaisesRegex(UserError,'Another window'):planner.save_state(s,r)
  (planner.DATA/'.saving.lock').unlink();(planner.DATA/'trips.json').write_text('broken')
  with self.assertRaisesRegex(UserError,'could not be read'):planner.save_state(s,r)
  self.assertEqual((planner.DATA/'trips.json').read_text(),'broken')
 def test_schema_and_real_frontend_fixture(self):
  root=Path(__file__).resolve().parent
  s=json.loads(subprocess.check_output(['node',str(root/'domain.cjs'),'--fixture']))
  validate(s);r=planner.save_state(s,'new');self.assertEqual(planner.read_state()[0],s)
  for mutate in [lambda x:x['trips'][0]['options'][0].update(start='2026-02-30'),lambda x:x['trips'][0]['options'][0].update(miles=-1),lambda x:x['trips'][0]['options'][0].update(miles=float('nan')),lambda x:x['trips'][0]['decision'].update(selected='missing'),lambda x:x['trips'].append(copy.deepcopy(x['trips'][0])),lambda x:x['trips'][0]['job'].update(name='')]:
   bad=copy.deepcopy(s);mutate(bad)
   with self.assertRaises(UserError):validate(bad)
 def test_optional_daily_plan_and_backup_roundtrip(self):
  s=json.loads(subprocess.check_output(['node',str(Path(__file__).parent/'domain.cjs'),'--fixture']))
  t=s['trips'][0];t.pop('dailyPlan',None);t.pop('planningIdeas',None);validate(s)
  t['dailyPlan']=[{'id':'day1','date':'2026-03-07','title':'Travel','morning':'Drive','afternoon':'Check in','evening':'Rest','notes':'Keep this'}];t['planningIdeas']='AI notes'
  r=planner.save_state(s,'new');self.assertEqual(planner.read_state()[0],s)
  bad=copy.deepcopy(s);bad['trips'][0]['dailyPlan'].append(dict(t['dailyPlan'][0],id='day2'))
  with self.assertRaisesRegex(UserError,'unique date'):validate(bad)
  for value in ['2026-02-30',None]:
   bad=copy.deepcopy(s);bad['trips'][0]['dailyPlan'][0]['date']=value
   with self.assertRaises(UserError):validate(bad)
  bad=copy.deepcopy(s);bad['trips'][0]['dailyPlan'][0]['notes']={}
  with self.assertRaises(UserError):validate(bad)
 def test_http_auth_and_assets(self):
  server=planner.ThreadingHTTPServer(('127.0.0.1',0),planner.Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(server.server_port)
  try:
   data=json.load(urllib.request.urlopen(base+'/api/state'));self.assertEqual(data['revision'],'new')
   for asset in ['/','/app.js','/domain.js','/style.css','/travel-planner.svg','/travel-planner.ico']:self.assertEqual(urllib.request.urlopen(base+asset).status,200)
   body=json.dumps({'state':empty(),'previous':'new'}).encode()
   with self.assertRaises(urllib.error.HTTPError) as denied:urllib.request.urlopen(urllib.request.Request(base+'/api/save',data=body))
   self.assertEqual(denied.exception.code,403)
   r=json.load(urllib.request.urlopen(urllib.request.Request(base+'/api/save',data=body,headers={'X-Planner-Token':data['token']})));self.assertNotEqual(r['revision'],'new')
   with self.assertRaises(urllib.error.HTTPError):urllib.request.urlopen(urllib.request.Request(base+'/api/state',headers={'Host':'example.com'}))
  finally:server.shutdown();server.server_close();thread.join()
if __name__=='__main__':unittest.main()
