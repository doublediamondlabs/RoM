const {
    JSDOM
  } = require(process.env.PLANNER_JSDOM || 'jsdom'),
  fs = require('fs'),
  path = require('path'),
  assert = require('node:assert/strict');
const packet = require('./inspection-transfer.json'),
  initial = {
    app: 'double-diamond-travel',
    version: 1,
    trips: [],
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
  };
let saved = structuredClone(initial),
  pendingFile = packet,
  downloads = 0,
  validationFails = false,
  downloadBlob = null;
const w = new JSDOM('<div id="app"></div><dialog id="dialog"></dialog>', {
  url: 'http://localhost',
  runScripts: 'outside-only'
}).window;
w.structuredClone = structuredClone;
w.confirm = () => true;
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
w.Blob = Blob;
w.URL.createObjectURL = blob => {
  downloadBlob = blob;
  return 'blob:test';
};
w.URL.revokeObjectURL = () => {};
w.HTMLAnchorElement.prototype.click = function () {
  downloads++;
};
w.HTMLInputElement.prototype.click = function () {
  if (this.type === 'file') {
    Object.defineProperty(this, 'files', {
      value: [{
        size: 100,
        text: async () => JSON.stringify(pendingFile)
      }]
    });
    this.onchange();
  }
};
w.fetch = async (url, opts) => {
  if (url === '/api/state') return {
    ok: true,
    json: async () => ({
      state: structuredClone(saved),
      revision: 'rev',
      token: 'token'
    })
  };
  if (url === '/api/validate' && validationFails) return {
    ok: false,
    json: async () => ({
      error: 'Invalid test import'
    })
  };
  if (url === '/api/save') saved = JSON.parse(opts.body).state;
  return {
    ok: true,
    json: async () => ({
      revision: 'saved'
    })
  };
};
for (const file of ['domain.js', 'app.js']) w.eval(fs.readFileSync(path.join(__dirname, '../app/web', file), 'utf8') + (file === 'app.js' ? '\nwindow.inspectState=()=>state;' : ''));
const tick = () => new Promise(r => setTimeout(r, 5)),
  q = s => w.document.querySelector(s),
  click = (a, id) => {
    const b = q(`[data-act="${a}"]${id ? `[data-id="${id}"]` : ''}`);
    assert.ok(b, a);
    b.click();
  },
  input = (scope, key, value) => {
    const e = q(`[data-scope="${scope}"][data-key="${key}"]`);
    assert.ok(e, key);
    e.value = value;
    e.dispatchEvent(new w.Event('input', {
      bubbles: true
    }));
  };
(async () => {
  await tick();
  assert.equal(q('[data-act="import-inspection"]').textContent, 'Plan from Expense Book');
  assert.ok(q('[data-act="import-inspection"]').classList.contains('primary'));
  click('import-inspection');
  await tick();
  assert.match(q('dialog').textContent, /Import Scheduled Inspection/);
  click('close');
  assert.equal(saved.trips.length, 0);
  click('import-inspection');
  await tick();
  validationFails = true;
  click('apply-inspection');
  await tick();
  assert.match(q('#message').textContent, /Invalid test import/);
  assert.equal(w.inspectState().trips.length, 0);
  validationFails = false;
  click('import-inspection');
  await tick();
  click('apply-inspection');
  await tick();
  assert.equal(w.inspectState().trips.length, 1);
  assert.ok(q('[data-act="tab"][data-id="options"]'));
  assert.match(q('main').textContent, /2026-11-05/);
  assert.equal(q('[data-key="name"]'), null);
  click('tab', 'handoff');
  input('handoff', 'actualMiles', '204');
  input('handoff', 'notes', 'Trip return details');
  click('return-preview');
  assert.match(q('#message').textContent, /Save Changes/);
  click('save');
  await tick();
  click('return-preview');
  assert.match(q('dialog').textContent, /204 actual miles/);
  click('download-return');
  assert.equal(downloads, 1);
  click('import-inspection');
  await tick();
  assert.match(q('dialog').textContent, /already loaded/);
  click('apply-inspection');
  await tick();
  assert.equal(w.inspectState().trips.length, 1);
  click('tab', 'options');
  input('option', 'confirmation', 'Keep reservation');
  input('option', 'start', '2026-11-04');
  input('option', 'end', '2026-11-06');
  click('save');
  await tick();
  click('tab', 'handoff');
  pendingFile = structuredClone(packet);
  pendingFile.generation = 'generation-2';
  pendingFile.exportedAt = '2026-10-18T00:00:00.000Z';
  pendingFile.inspection.date = '2026-11-12';
  click('import-inspection');
  await tick();
  assert.match(q('dialog').textContent, /inspection date changed/);
  click('apply-inspection');
  await tick();
  assert.match(q('main').textContent, /different inspection date/);
  click('tab', 'options');
  assert.equal(q('[data-key="confirmation"]').value, 'Keep reservation');
  assert.equal(q('[data-key="inspect"]').value, '2026-11-05');
  click('save');
  await tick();
  assert.equal(saved.trips.length, 1);
  assert.equal(saved.trips[0].handoff.source.inspection.date, '2026-11-12');
  pendingFile = {
    ...pendingFile,
    version: 2,
    generation: 'generation-3',
    exportedAt: '2026-10-21T00:00:00.000Z',
    expenseCatalog: [{
      year: 2026,
      categories: [{
        name: 'Fuel',
        subs: ['Van']
      }, {
        name: 'Food',
        subs: []
      }, {
        name: 'Lodging',
        subs: []
      }]
    }]
  };
  click('tab', 'handoff');
  click('import-inspection');
  await tick();
  click('apply-inspection');
  await tick();
  w.inspectState().trips[0].options[0].actualFuel = '99';
  click('tab', 'actual');
  assert.match(q('main').textContent, /Reference Only/);
  click('add-expense');
  input('expense', 'payee', 'Example Fuel Stop');
  input('expense', 'description', 'Filled the van');
  input('expense', 'amount', '50.25');
  input('expense', 'category', 'Fuel');
  input('expense', 'subCategory', 'Van');
  click('done-expense');
  assert.match(q('#itemized-summary').textContent, /\$50.25/);
  assert.doesNotMatch(q('#itemized-summary').textContent, /149.25/);
  click('save');
  await tick();
  click('return-preview');
  assert.match(q('dialog').textContent, /Fuel \/ Van/);
  assert.ok(q('[data-return-expense]:checked'));
  click('download-return');
  const transfer = JSON.parse(await downloadBlob.text());
  assert.equal(transfer.version, 2);
  assert.equal(transfer.expenses.length, 1);
  assert.equal(transfer.expenses[0].amount, 50.25);
  assert.equal(transfer.expenses[0].category, 'Fuel');
  assert.equal(saved.trips[0].tripExpenses[0].payee, 'Example Fuel Stop');
  console.log('PASS import-first UI, cancel/validation failure, linked update, source ownership, reschedule warning, saved return, itemized category/subcategory entry, selected expense export and legacy-total exclusion.');
  w.close();
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
  w.close();
});
