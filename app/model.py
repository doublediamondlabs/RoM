"""Persisted schema. Blank amounts and draft dates are allowed, malformed values are not."""
import datetime as dt,json,math,re
MAX_BYTES=16*1024*1024
class UserError(Exception):pass
def pack(s):return json.dumps(s,ensure_ascii=False,allow_nan=False,sort_keys=True,separators=(',',':')).encode('utf-8')
def empty():return {'app':'double-diamond-travel','version':1,'trips':[],'defaults':{'hotelMpgLow':24,'hotelMpgHigh':27,'rvMpgLow':9,'rvMpgHigh':10,'fuel':'','fuelAllowance':0.10,'checklistEnabled':False,'preferences':'','checklist':'Wallet / ID\nMedications\nPhone and chargers\nKeys\nPet supplies\nInspection clipboard and equipment (if needed)'},'navigation':['trips','workspace','defaults','settings']}
JOB_TEXT=['name','destination','rv','preferences','assumptions']
OPTION_TEXT=['name','address','contact','confirmation','terms','effort','notes']
OPTION_NUM=['miles','mpgLow','mpgHigh','fuel','total','nightly','tax','pet','fees','meals','other','wear','actualFuel','actualLodging','actualMeals','actualOther']
ENUMS={'mode':['hotel','rv'],'lodgingMode':['total','nightly'],'lodgingStatus':['Estimate','Quoted','Confirmed'],'schedule':['Unconfirmed','Works','Does not work'],'fit':['Unconfirmed','Works','Does not work'],'breakfast':['Unknown','Yes','No','Not applicable'],'suite':['Unknown','Yes','No','Not applicable'],'desire':['Neutral','Would enjoy','Prefer another option']}
def text(v,label,limit=30000):
 if not isinstance(v,str) or len(v)>limit:raise UserError('Invalid text: '+label)
def amount(v,label):
 if v=='':return
 if isinstance(v,bool) or not isinstance(v,(str,int,float)):raise UserError('Invalid amount: '+label)
 try:n=float(v)
 except ValueError:raise UserError('Invalid amount: '+label)
 if not math.isfinite(n) or n<0 or n>1e9 or isinstance(v,str) and not v.strip():raise UserError('Invalid amount: '+label)
def date(v,label):
 text(v,label,10)
 if v:
  try:
   if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',v):raise ValueError()
   dt.date.fromisoformat(v)
  except ValueError:raise UserError('Invalid date: '+label)
def records(items,label,limit):
 if not isinstance(items,list) or len(items)>limit:raise UserError('Invalid list: '+label)
 seen=set()
 for x in items:
  if not isinstance(x,dict) or not isinstance(x.get('id'),str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}',x['id']) or x['id'] in seen:raise UserError('Invalid or duplicate ID: '+label)
  seen.add(x['id'])
def validate(s):
 if not isinstance(s,dict) or set(s)!={'app','version','trips','defaults','navigation'} or s['app']!='double-diamond-travel' or s['version']!=1:raise UserError('Not a RōM backup.')
 if not isinstance(s['navigation'],list) or len(s['navigation'])!=4 or any(not isinstance(x,str) for x in s['navigation']) or set(s['navigation'])!={'trips','workspace','defaults','settings'}:raise UserError('Invalid menu order.')
 d=s['defaults']
 if not isinstance(d,dict) or set(d)-{'checklistEnabled','fuelAllowance'}!=set(empty()['defaults'])-{'checklistEnabled','fuelAllowance'}:raise UserError('Invalid travel defaults.')
 if 'checklistEnabled' in d and not isinstance(d['checklistEnabled'],bool):raise UserError('Invalid checklist visibility.')
 if 'fuelAllowance' in d:amount(d['fuelAllowance'],'fuel price allowance')
 for k in ['hotelMpgLow','hotelMpgHigh','rvMpgLow','rvMpgHigh','fuel']:amount(d[k],k)
 for k in ['preferences','checklist']:text(d[k],k)
 records(s['trips'],'trips',1000)
 for t in s['trips']:
  if 'handoff' in t:validate_handoff(t['handoff'])
 links=[t['handoff']['source']['linkId'] for t in s['trips'] if 'handoff' in t]
 if len(links)!=len(set(links)):raise UserError('Duplicate inspection trip link.')
 for t in s['trips']:
  if t.get('type') not in ['Inspection','Personal']:raise UserError('Invalid trip type.')
  if not isinstance(t.get('archived'),bool):raise UserError('Invalid archive flag.')
  for k in ['created','updated']:date(t.get(k),k)
  j=t.get('job')
  if not isinstance(j,dict):raise UserError('Missing trip overview.')
  for k in JOB_TEXT:text(j.get(k),k)
  if not j['name'].strip():raise UserError('Give each trip a name.')
  for k in ['quote','base','budget']:amount(j.get(k),k)
  if 'tripExpenses' in t:
   records(t['tripExpenses'],'trip expenses',500)
   for x in t['tripExpenses']:validate_expense(x)
  if 'expensesComplete' in t and not isinstance(t['expensesComplete'],bool):raise UserError('Invalid expense completion flag.')
  if 'handoff' in t:validate_handoff(t['handoff'])
  records(t.get('options'),'options',100)
  for o in t['options']:
   for k in OPTION_TEXT:text(o.get(k),k)
   if 'fuelAllowance' in o:amount(o['fuelAllowance'],'fuel price allowance')
   for k in OPTION_NUM:amount(o.get(k),k)
   for k in ['start','inspect','end','cancelBy']:date(o.get(k),k)
   for k,values in ENUMS.items():
    if o.get(k) not in values:raise UserError('Invalid option choice: '+k)
  dec=t.get('decision')
  if not isinstance(dec,dict):raise UserError('Missing trip decision.')
  text(dec.get('notes'),'decision notes');text(dec.get('selected'),'selected option',100)
  if dec['selected'] and dec['selected'] not in [o['id'] for o in t['options']]:raise UserError('Selected option was not found.')
  if dec.get('status') not in ['Exploring','Tentatively selected','Ready to offer date','Booked','Completed','Declined','Cancelled']:raise UserError('Invalid trip status.')
  if 'planningIdeas' in t:text(t['planningIdeas'],'planning ideas')
  if 'dailyPlan' in t:
   records(t['dailyPlan'],'daily plan',366)
   seen_dates=set()
   for entry in t['dailyPlan']:
    date(entry.get('date'),'daily plan date')
    if entry['date'] and entry['date'] in seen_dates:raise UserError('Each dated daily plan entry must have a unique date.')
    if entry['date']:seen_dates.add(entry['date'])
    for key in ['title','morning','afternoon','evening','notes']:text(entry.get(key),'daily plan '+key)
  records(t.get('checklist'),'checklist',200)
  for c in t['checklist']:
   text(c.get('label'),'checklist',500)
   if not isinstance(c.get('done'),bool):raise UserError('Invalid checklist status.')
 if len(pack(s))>MAX_BYTES:raise UserError('This workspace is too large. Export a backup before starting a separate workspace.')

def validate_handoff(h):
 if not isinstance(h,dict) or set(h)!={'source','actualMiles','notes'}:raise UserError('Invalid inspection handoff.')
 amount(h['actualMiles'],'actual visit miles');text(h['notes'],'return notes',3000)
 p=h['source']
 if not isinstance(p,dict) or set(p)!={'format','version','linkId','generation','jobId','visitId','exportedAt','inspection'}|({'expenseCatalog'} if p.get('version')==2 else set()) or p['format']!='double-diamond-inspection-trip' or p['version'] not in [1,2]:raise UserError('Invalid inspection source.')
 if p['version']==2:validate_catalog(p['expenseCatalog'])
 for k in ['linkId','generation','jobId','visitId','exportedAt']:
  text(p[k],k,200)
  if not p[k]:raise UserError('Missing inspection identity.')
 i=p['inspection']
 if not isinstance(i,dict) or set(i)!={'name','date','outcome','purpose','vehicle','miles','rv','vin','contacts','destination','quote','notes'}:raise UserError('Invalid inspection details.')
 for k in ['name','date','outcome','purpose','vehicle','rv','vin','contacts','destination','notes']:text(i[k],k)
 date(i['date'],'inspection date')
 if not i['date'] or i['outcome'] not in ['Scheduled','Completed','Partially completed','Not performed','Canceled','Not reviewed']:raise UserError('Invalid inspection date or outcome.')
 for k in ['miles','quote']:
  if i[k] is not None:
   if isinstance(i[k],bool) or not isinstance(i[k],(int,float)):raise UserError('Invalid recorded '+k)
   amount(i[k],k)

def validate_catalog(catalog):
 if not isinstance(catalog,list) or len(catalog)>301:raise UserError('Invalid expense category catalog.')
 years=set()
 for entry in catalog:
  if not isinstance(entry,dict) or set(entry)!={'year','categories'} or type(entry['year']) is not int or not 1900<=entry['year']<=2200 or entry['year'] in years:raise UserError('Invalid category year.')
  years.add(entry['year']);cats=entry['categories']
  if not isinstance(cats,list) or len(cats)>1000:raise UserError('Invalid categories.')
  names=set()
  for c in cats:
   if not isinstance(c,dict) or set(c)!={'name','subs'}:raise UserError('Invalid category.')
   text(c['name'],'category',200)
   if not c['name'].strip() or c['name'] in names:raise UserError('Invalid category name.')
   names.add(c['name'])
   if not isinstance(c['subs'],list) or len(c['subs'])>1000:raise UserError('Invalid subcategories.')
   seen=set()
   for sub in c['subs']:
    text(sub,'subcategory',200)
    if not sub.strip() or sub in seen:raise UserError('Invalid subcategory.')
    seen.add(sub)
def validate_expense(x):
 if set(x)!={'id','date','payee','description','amount','category','subCategory','bucket'}:raise UserError('Invalid trip expense.')
 date(x['date'],'expense date');amount(x['amount'],'expense amount')
 if x['amount']!='' and abs(float(x['amount'])*100-round(float(x['amount'])*100))>.0001:raise UserError('Expense amounts use at most two decimal places.')
 for k,maxlen in [('payee',200),('description',500),('category',200),('subCategory',200)]:text(x[k],k,maxlen)
 if x['bucket'] not in ['Fuel','Lodging','Meals','Other']:raise UserError('Invalid planning cost group.')
