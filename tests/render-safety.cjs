'use strict';
const { JSDOM } = require(process.env.PLANNER_JSDOM || 'jsdom');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const w = new JSDOM('<div id="app"></div><dialog id="dialog"></dialog>', { url: 'http://localhost', runScripts: 'outside-only' }).window;
w.structuredClone = structuredClone;
w.fetch = () => new Promise(() => {});
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.eval(fs.readFileSync(path.join(__dirname, '../app/web/domain.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(__dirname, '../app/web/app.js'), 'utf8') + '\nwindow.safety = { navButton, esc, field, help, decision, pack, daily, promptDialog, importInspectionFile, setState: x => { state = x; active = x.trips[0]?.id || ""; } };');
const payload = '\"><img src=x onerror="window.injected=true">';
const target = w.document.querySelector('#app');
for (const key of [payload, '__proto__', 'constructor', null]) {
  target.innerHTML = w.safety.navButton(key);
  assert.equal(target.children.length, 0, 'Invalid menu key must not render');
}
for (const key of ['trips', 'workspace', 'defaults', 'settings']) {
  target.innerHTML = w.safety.navButton(key);
  assert.equal(target.querySelector('button').dataset.id, key);
}
// Exercise text and quoted-attribute contexts with repeated metacharacters and
// entity-like strings. The user's original characters must survive exactly once.
for (const text of [payload, '&lt;img&gt;', 'A&B < > " \' & < > " \'', '</textarea><script>alert(1)</script>', 'Bish’s & family']) {
  target.innerHTML = w.safety.field('name', 'Name', text);
  assert.equal(target.querySelector('input').value, text);
  assert.equal(target.querySelector('img,script,[onerror],[onfocus]'), null);
  target.innerHTML = w.safety.help(text);
  assert.equal(target.textContent, text);
  assert.equal(target.querySelector('img,script'), null);
}
const sample = w.Travel.importTrip(JSON.parse(fs.readFileSync(path.join(__dirname, '../examples/weekend-demo.json'))));
sample.options[0].id = payload;
sample.decision.selected = payload;
sample.checklist = [{ id: payload, label: payload, done: false }];
sample.dailyPlan = [{ id: payload, date: '2027-05-14', title: payload, morning: payload, afternoon: '', evening: '', notes: '' }];
w.safety.setState({ trips: [sample], defaults: { checklistEnabled: true } });
for (const render of [w.safety.decision, w.safety.pack, w.safety.daily]) {
  target.innerHTML = render();
  assert.equal(target.querySelector('img,script,[onerror],[onfocus]'), null);
}
target.innerHTML = w.safety.decision();
assert.equal(target.querySelector('option[value]').nextElementSibling.value, payload);
target.innerHTML = w.safety.pack();
assert.equal(target.querySelector('[data-check]').dataset.check, payload);
target.innerHTML = w.safety.daily();
assert.equal(target.querySelector('[data-act="day"]').dataset.id, payload);
w.safety.promptDialog();
assert.equal(w.document.querySelector('#prompt-option').value, payload);
assert.equal(w.document.querySelector('dialog img,dialog script,dialog [onerror]'), null);
const packet = JSON.parse(fs.readFileSync(path.join(__dirname, 'inspection-transfer.json')));
packet.inspection.name = payload;
packet.inspection.miles = 42;
w.safety.setState({ trips: [] });
// Isolate the display boundary: even if upstream validation regresses, HTML stays text.
w.Travel.importInspection = () => ({ existing: false });
w.HTMLInputElement.prototype.click = function () {
  Object.defineProperty(this, 'files', { value: [{ size: 100, text: async () => JSON.stringify(packet) }] });
  w.pendingImport = this.onchange();
};
(async () => {
  await w.safety.importInspectionFile();
  await w.pendingImport;
  const d = w.document.querySelector('dialog');
  assert.equal(d.querySelector('img'), null);
  assert.ok(d.textContent.includes(payload));
  assert.ok(d.textContent.includes('Recorded miles: 42'));
  packet.inspection.miles = payload;
  await w.safety.importInspectionFile();
  await w.pendingImport;
  assert.equal(d.querySelector('img'), null);
  assert.ok(d.textContent.includes('Recorded miles: ' + payload));
  console.log('PASS text/attribute escaping, imported option/checklist/day IDs, prompt dialog, menu allowlist, and inspection preview with upstream validation bypass.');
  w.close();
})().catch(e => { console.error(e); w.close(); process.exitCode = 1; });
