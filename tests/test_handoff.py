import copy,json,subprocess,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from model import validate,UserError
ROOT=Path(__file__).resolve().parents[1]
class HandoffTests(unittest.TestCase):
 def test_itemized_expense_schema(self):
  state=json.loads(subprocess.check_output(['node','tests/expenses.cjs','--fixture'],cwd=ROOT));validate(state)
  for mutate in [lambda s:s['trips'][0]['tripExpenses'][0].update(amount='1.001'),lambda s:s['trips'][0]['tripExpenses'][0].update(payee='x'*201),lambda s:s['trips'][0]['handoff']['source']['expenseCatalog'][0].update(year='2026')]:
   bad=copy.deepcopy(state);mutate(bad)
   with self.assertRaises(UserError):validate(bad)
 def test_imported_fixture_and_schema(self):
  code="const T=require('./app/web/domain.js'),p=require('./tests/inspection-transfer.json');const s="+json.dumps({'app':'double-diamond-travel','version':1,'trips':[],'defaults':{'hotelMpgLow':24,'hotelMpgHigh':27,'rvMpgLow':9,'rvMpgHigh':10,'fuel':'','preferences':'','checklist':''},'navigation':['trips','workspace','defaults','settings']})+";console.log(JSON.stringify(T.importInspection(s,p).next));"
  state=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT));validate(state);validate(json.loads(json.dumps(state)))
  for mutate in [lambda h:h.update(actualMiles=-1),lambda h:h.update(notes='x'*3001),lambda h:h['source'].update(linkId=[]),lambda h:h['source']['inspection'].update(date='2026-02-30'),lambda h:h['source']['inspection'].update(miles='200'),lambda h:h.update(source=None)]:
   bad=copy.deepcopy(state);mutate(bad['trips'][0]['handoff'])
   with self.assertRaises(UserError):validate(bad)
  bad=copy.deepcopy(state);t=copy.deepcopy(bad['trips'][0]);t['id']='second';bad['trips'].append(t)
  with self.assertRaisesRegex(UserError,'Duplicate inspection'):validate(bad)
if __name__=='__main__':unittest.main()
