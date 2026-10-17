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
w.eval(fs.readFileSync(path.join(__dirname, '../app/web/app.js'), 'utf8') + '\nwindow.safety = { navButton, importInspectionFile, setState: x => { state = x; } };');
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
  console.log('PASS menu allowlist and inspection preview HTML escaping, including upstream validation bypass.');
  w.close();
})().catch(e => { console.error(e); w.close(); process.exitCode = 1; });
