const assert = require('node:assert/strict'),
  T = require('../app/web/domain.js'),
  packet = require('./inspection-transfer.json');
const state = {
  app: 'double-diamond-travel',
  version: 1,
  trips: [],
  defaults: {
    hotelMpgLow: 24,
    hotelMpgHigh: 27,
    rvMpgLow: 9,
    rvMpgHigh: 10,
    fuel: '',
    preferences: 'Dog friendly',
    checklist: 'Keys'
  },
  navigation: ['trips', 'workspace', 'defaults', 'settings']
};
const r = T.importInspection(state, packet),
  t = r.next.trips[0];
assert.equal(state.trips.length, 0);
assert.equal(t.options[0].inspect, '2026-11-05');
assert.equal(t.options[0].miles, '');
assert.equal(t.job.quote, 1200);
assert.equal(t.handoff.actualMiles, '');
assert.equal(T.importInspection(r.next, packet).next.trips.length, 1);
assert.equal(T.importInspection(r.next, packet).unchanged, true);
t.options[0].start = '2026-11-04';
t.options[0].end = '2026-11-06';
t.options[0].confirmation = 'Booked-123';
t.dailyPlan = [T.day('2026-11-05', 'Original plan')];
t.handoff.actualMiles = '204';
t.handoff.notes = 'Actual trip note';
t.archived = true;
const fresh = structuredClone(packet);
fresh.generation = 'generation-2';
fresh.exportedAt = '2026-10-18T00:00:00.000Z';
fresh.inspection.date = '2026-11-12';
const update = T.importInspection(r.next, fresh);
assert.equal(update.rescheduled, true);
assert.equal(update.next.trips.length, 1);
assert.equal(update.next.trips[0].options[0].inspect, '2026-11-05');
assert.equal(update.next.trips[0].options[0].confirmation, 'Booked-123');
assert.equal(update.next.trips[0].dailyPlan[0].date, '2026-11-05');
assert.equal(update.next.trips[0].archived, true);
assert.throws(() => T.importInspection(update.next, packet), /older/);
assert.equal(T.duplicate(t).handoff, undefined);
assert.equal(T.importTrip({
  ...t,
  version: 1
}).handoff, undefined);
const result = T.tripResults(t, true, true);
assert.equal(result.actualMiles, 204);
assert.equal(result.notes, 'Actual trip note');
assert.equal(result.visitId, 'visit-1');
assert.equal(T.tripResults(t, false, true).actualMiles, null);
assert.equal(T.tripResults(t, true, false).notes, '');
assert.throws(() => T.tripResults(t, false, false), /Choose/);
assert.ok(!T.planningPrompt(t, t.options[0]).includes('555-0100'));
assert.ok(!T.planningPrompt(t, t.options[0]).includes('001234'));
const other = structuredClone(packet);
other.linkId = 'other-visit';
other.visitId = 'visit-2';
assert.equal(T.importInspection(r.next, other).next.trips.length, 2);
assert.throws(() => T.importInspection({
  ...r.next,
  trips: [t, t]
}, packet), /More than one/);
assert.throws(() => T.importInspection(state, {
  ...packet,
  version: 3
}), /Choose/);
console.log('PASS linked import, reschedule preservation, archived refresh, duplicates, actual-mile returns and contact exclusion from prompt.');
const reorder = v => v && typeof v === 'object' ? Array.isArray(v) ? v.map(reorder) : Object.fromEntries(Object.keys(v).sort().map(k => [k, reorder(v[k])])) : v;
assert.equal(T.importInspection(reorder(r.next), packet).unchanged, true);
