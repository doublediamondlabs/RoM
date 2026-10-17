const assert = require('node:assert/strict');
const T = require('../app/web/domain.js');
const t = T.trip('Inspection'),
  o = t.options[0];
Object.assign(t.job, {
  quote: 1500,
  base: 1200
});
Object.assign(o, {
  start: '2026-03-07',
  inspect: '2026-03-08',
  end: '2026-03-09',
  fuelAllowance: 0,
  miles: 600,
  mpgLow: 10,
  mpgHigh: 20,
  fuel: 3,
  lodgingMode: 'nightly',
  nightly: 100,
  tax: 10,
  pet: 40,
  fees: 10,
  meals: 50,
  other: 20,
  wear: .1
});
let c = T.calc(t, o);
assert.equal(c.n, 2);
assert.equal(c.lodging, 270);
assert.equal(c.low, 490);
assert.equal(c.high, 580);
assert.equal(c.cashLow, 430);
assert.equal(c.remainLow, 920);
assert.equal(c.diffLow, -280);
o.total = '';
o.lodgingMode = 'total';
assert.ok(T.calc(t, o).errors.length);
o.total = 0;
assert.equal(T.calc(t, o).errors.length, 0);
o.start = '2026-02-30';
assert.equal(T.nights(o), null);
o.start = '2026-03-07';
o.end = '2026-03-07';
assert.ok(T.calc(t, o).errors.length);
o.inspect = '2026-03-07';
assert.equal(T.calc(t, o).n, 0);
t.type = 'Personal';
t.job.quote = '';
t.job.base = '';
o.inspect = '';
assert.equal(T.calc(t, o).errors.length, 0);
assert.equal(T.calc(t, o).budgetLow, null);
t.job.budget = 100;
assert.ok(T.calc(t, o).budgetLow < 0);
assert.equal(T.actual(o).complete, false);
Object.assign(o, {
  actualFuel: 0,
  actualLodging: 100,
  actualMeals: 30,
  actualOther: 5
});
assert.deepEqual(T.actual(o), {
  complete: true,
  known: 135
});
t.decision.selected = o.id;
t.checklist = [{
  id: T.uid(),
  label: 'Keys',
  done: true
}];
o.confirmation = 'CONFIRMED';
o.cancelBy = '2026-03-01';
const copy = T.duplicate(t);
assert.notEqual(copy.id, t.id);
assert.notEqual(copy.options[0].id, o.id);
assert.equal(copy.decision.selected, copy.options[0].id);
assert.equal(copy.options[0].actualFuel, '');
assert.equal(copy.options[0].confirmation, '');
assert.equal(copy.checklist[0].done, false);
assert.equal(t.options[0].confirmation, 'CONFIRMED');
const legacy = {
  version: 1,
  job: {
    name: 'Legacy trip',
    destination: 'Town',
    rv: 'Trailer',
    quote: 1500,
    base: 1200,
    preferences: 'Dog',
    assumptions: 'Estimate'
  },
  options: [{
    ...o
  }],
  decision: {
    selected: o.id,
    status: 'Exploring',
    notes: 'Choose later'
  }
};
delete legacy.options[0].actualFuel;
const imported = T.importTrip(legacy);
assert.equal(imported.type, 'Inspection');
assert.equal(imported.job.name, 'Legacy trip');
assert.equal(imported.options[0].actualFuel, '');
assert.equal(imported.decision.selected, imported.options[0].id);
assert.notEqual(imported.options[0].id, o.id);
assert.equal(imported.options[0].miles, 600);
const round = T.importTrip({
  ...t,
  version: 1
});
assert.equal(round.type, 'Personal');
assert.equal(round.checklist[0].label, 'Keys');
const schedule = T.trip('Inspection'),
  so = schedule.options[0];
Object.assign(so, {
  start: '2026-03-07',
  inspect: '2026-03-08',
  end: '2026-03-09',
  confirmation: 'PRIVATE-CONFIRMATION',
  contact: 'PRIVATE-PHONE'
});
schedule.job.name = 'PRIVATE-CUSTOMER';
schedule.job.preferences = '52 lb dog; uncrated in room';
schedule.job.quote = 1500;
schedule.job.base = 1200;
schedule.planningIdeas = 'PRIVATE-SCRATCHPAD';
schedule.dailyPlan = T.missingDays(schedule, so);
assert.deepEqual(schedule.dailyPlan.map(d => d.date), ['2026-03-07', '2026-03-08', '2026-03-09']);
assert.equal(schedule.dailyPlan[1].title, 'Inspection day');
schedule.dailyPlan[1].morning = 'Inspection all morning';
assert.equal(T.missingDays(schedule, so).length, 0);
so.end = '2026-03-10';
assert.equal(T.missingDays(schedule, so).length, 1);
so.end = '2026-03-08';
assert.equal(T.outsideDays(schedule, so).length, 1);
assert.equal(schedule.dailyPlan[1].morning, 'Inspection all morning');
const prompt = T.planningPrompt(schedule, so);
assert.match(prompt, /52 lb dog/);
assert.match(prompt, /NOT a travel budget/);
assert.match(prompt, /NOT a spending ceiling/);
assert.match(prompt, /Inspection all morning/);
for (const x of ['PRIVATE-CONFIRMATION', 'PRIVATE-PHONE', 'PRIVATE-CUSTOMER', 'PRIVATE-SCRATCHPAD']) assert.ok(!prompt.includes(x));
assert.match(prompt, /outside this option/);
assert.throws(() => T.missingDays(schedule, null));
assert.throws(() => T.missingDays(schedule, {
  start: '2026-01-01',
  end: '2028-01-01'
}));
const scopy = T.duplicate(schedule);
assert.notEqual(scopy.dailyPlan[0].id, schedule.dailyPlan[0].id);
assert.equal(scopy.dailyPlan[1].morning, 'Inspection all morning');
const restored = T.importTrip({
  ...schedule,
  version: 1
});
assert.equal(restored.dailyPlan[1].morning, 'Inspection all morning');
assert.notEqual(restored.dailyPlan[0].id, schedule.dailyPlan[0].id);
assert.equal(restored.planningIdeas, 'PRIVATE-SCRATCHPAD');
const personalPrompt = T.planningPrompt(t, o);
assert.match(personalPrompt, /Optional total travel budget: \$100.00/);
assert.ok(!personalPrompt.includes('Quoted inspection fee'));
assert.ok(!personalPrompt.includes('Inspection date:'));
if (process.argv.includes('--fixture')) process.stdout.write(JSON.stringify({
  app: 'double-diamond-travel',
  version: 1,
  trips: [t],
  defaults: {
    hotelMpgLow: 24,
    hotelMpgHigh: 27,
    rvMpgLow: 9,
    rvMpgHigh: 10,
    fuel: '',
    preferences: '',
    checklist: 'Keys'
  },
  navigation: ['trips', 'workspace', 'defaults', 'settings']
}));else console.log('Domain checks passed: costs, incomplete amounts, dates, personal budget, actuals, duplicate and legacy import.');
const ft = T.trip('Personal'),
  fo = ft.options[0];
Object.assign(fo, {
  start: '2026-11-01',
  end: '2026-11-02',
  miles: 600,
  mpgLow: 10,
  mpgHigh: 20,
  fuel: 3.5,
  total: 0
});
assert.equal(fo.fuelAllowance, .1);
let fc = T.calc(ft, fo);
assert.equal(fc.fuelLow, 102);
assert.equal(fc.fuelHigh, 216);
assert.equal(fc.fuelPriceLow, 3.4);
assert.equal(fc.fuelPriceHigh, 3.6);
delete fo.fuelAllowance;
fc = T.calc(ft, fo);
assert.equal(fc.fuelLow, 105);
assert.equal(fc.fuelHigh, 210);
const fi = T.importTrip({
  ...ft,
  version: 1
});
assert.equal(fi.options[0].fuelAllowance, 0);
fo.fuelAllowance = 4;
assert.equal(T.calc(ft, fo).fuelLow, 0);
fo.fuelAllowance = -1;
assert.ok(T.calc(ft, fo).errors.length);
fo.fuelAllowance = '';
assert.ok(T.calc(ft, fo).errors.length);
assert.equal(T.option('rv', {
  fuelAllowance: .25
}).fuelAllowance, .25);
if (!process.argv.includes('--fixture')) console.log('PASS fuel price range, MPG extremes, legacy preservation, zero floor and invalid allowance.');
