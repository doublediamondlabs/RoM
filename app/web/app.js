'use strict';

const T = Travel,
  $ = s => document.querySelector(s),
  esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
const money = n => n === null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(n),
  range = (a, b) => a === null || b === null ? '—' : Math.abs(a - b) < .005 ? money(a) : money(a) + ' – ' + money(b);
let state,
  revision,
  token,
  dirty = false,
  busy = false,
  page = 'trips',
  tab = 'overview',
  active = '',
  optionId = '',
  collapsed = false,
  filter = 'Active',
  search = '',
  message = '',
  error = false;
const titles = {
  trips: 'My Trips',
  workspace: 'Trip Workspace',
  defaults: 'Travel Defaults',
  settings: 'Backup & Settings'
};
const btn = (label, act, id = '', cls = '') => `<button class="${cls}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
const trip = () => state.trips.find(t => t.id === active),
  opt = () => trip()?.options.find(o => o.id === optionId) || trip()?.options[0];
function field(k, label, value, type = 'text', choices = null, scope = 'job') {
  return `<label>${esc(label)}${choices ? `<select data-scope="${scope}" data-key="${k}">${choices.map(x => `<option ${x === value ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : type === 'textarea' ? `<textarea data-scope="${scope}" data-key="${k}">${esc(value)}</textarea>` : `<input data-scope="${scope}" data-key="${k}" type="${type}" ${type === 'number' ? 'min="0" step="any"' : ''} value="${esc(value)}">`}</label>`;
}
let defaultsTab = 'van',
  settingsTab = 'backup';
const checklistEnabled = () => state.defaults.checklistEnabled === true;
const icons = {
  trips: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  workspace: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3"/>',
  defaults: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/>',
  settings: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
};
const navButton = k => {
  if (!['trips', 'workspace', 'defaults', 'settings'].includes(k)) return '';
  return `<button data-act="nav" data-id="${esc(k)}" class="${page === k ? 'active' : ''}" ${page === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${icons[k]}</svg><span>${esc(titles[k])}</span></button>`;
};
const help = s => `<p class="help">${s}</p>`;
const badge = s => `<span class="badge">${esc(s)}</span>`;
function note(s, bad = false) {
  message = s;
  error = bad;
  const el = $('#message');
  if (el) {
    el.hidden = !s;
    el.className = bad ? 'message error' : 'message';
    el.textContent = s;
  }
}
function mark() {
  dirty = true;
  const el = $('#save-status');
  if (el) el.textContent = 'Unsaved changes';
  if (trip() && page === 'workspace') trip().updated = T.today();
}
async function api(path, body) {
  const r = await fetch('/api/' + path, body === undefined ? {} : {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Planner-Token': token
    },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error || 'Request failed.');
  return j;
}
async function load() {
  const r = await api('state');
  state = r.state;
  revision = r.revision;
  token = r.token;
  dirty = false;
  if (!trip()) active = '';
  render();
}
async function save() {
  busy = true;
  render();
  try {
    const r = await api('save', {
      state,
      previous: revision
    });
    revision = r.revision;
    dirty = false;
    note('Saved to your application folder.');
  } catch (e) {
    note(e.message, true);
  } finally {
    busy = false;
    render();
  }
}
function download(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], {
    type: 'application/json'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const safeName = s => String(s).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80);
function exportAll() {
  download('RoM-' + T.today() + '.json', state);
}
function modal(html, cls = '') {
  const d = $('#dialog');
  d.className = cls;
  d.innerHTML = html;
  d.showModal();
}
function closeModal() {
  $('#dialog').close();
  $('#dialog').innerHTML = '';
}
function shell() {
  return `<div class="layout ${collapsed ? 'collapsed' : ''}"><aside><div class="brand"><img src="/travel-planner.svg" alt="RōM sunrise and road"><div>RōM<small>TRAVEL PLANNER</small></div></div><p class="credit">Developed by <strong>Double Diamond Labs</strong><span> - Adventure On!</span></p><div class="side-heading"><strong>WORKSPACE</strong><button data-act="collapse" aria-expanded="${!collapsed}" aria-label="${collapsed ? 'Expand' : 'Collapse'} sidebar">${collapsed ? '☰' : '‹'}</button></div><div class="side-content"><nav>${state.navigation.map(navButton).join('')}</nav>${btn('Arrange Menu', 'arrange')}<div class="side-bottom"><strong>Your trips. Your direction.</strong><p>Saved in your folder.<br>Ready for the road.</p><small>RōM · 0.1.9</small>${btn('Exit RōM', 'exit')}</div></div></aside><div class="workspace"><header><span id="save-status">${dirty ? 'Unsaved changes' : 'Saved workspace'}</span><div class="actions">${btn('Save Changes', 'save', '', 'primary')}${btn('Export Current Copy', 'backup')}${btn('Exit RōM', 'exit')}</div></header><main><div id="message" class="message ${error ? 'error' : ''}" ${message ? '' : 'hidden'}>${esc(message)}</div><div class="heading"><div><div class="eyebrow">A LITTLE DIRECTION FOR YOUR NEXT ADVENTURE</div><h1>${titles[page]}</h1></div>${page === 'workspace' && trip() ? btn('Print Departure Brief', 'brief') : ''}</div>${{
    trips: myTrips,
    workspace: workspace,
    defaults: defaults,
    settings: settings
  }[page]()}</main></div></div>`;
}
function render() {
  if (!state) return;
  $('#app').innerHTML = shell();
  $('#app').inert = busy;
}
function myTrips() {
  let list = state.trips.filter(t => filter === 'Archived' ? t.archived : !t.archived).filter(t => filter === 'Inspection' || filter === 'Personal' ? t.type === filter : true).filter(t => (t.job.name + ' ' + t.job.destination).toLowerCase().includes(search.toLowerCase()));
  list.sort((a, b) => {
    const date = t => (t.options.find(o => o.id === t.decision.selected) || t.options[0])?.start || '9999';
    return date(a).localeCompare(date(b)) || b.updated.localeCompare(a.updated);
  });
  return `<div class="heading"><div class="tabs" aria-label="Trip filter">${['Active', 'Inspection', 'Personal', 'Archived'].map(x => btn(x, 'filter', x, x === filter ? 'active' : '')).join('')}</div><div class="actions">${btn('Plan from Expense Book', 'import-inspection', '', 'primary')}${btn('+ Personal Trip', 'new', 'Personal')}${btn('Explore an Unscheduled Trip', 'new', 'Inspection')}</div></div><label class="search">Find a trip<input id="search" placeholder="Trip name or destination" value="${esc(search)}"></label>${help('Begin scheduled inspection travel with Plan from Expense Book. Importing creates the trip; importing the same visit again refreshes it. Archiving keeps its history. Save Changes writes your work to the shared folder.')}<div class="trip-grid">${list.map(t => {
    const o = t.options.find(x => x.id === t.decision.selected),
      a = o && T.calc(t, o);
    return `<article class="card"><div class="heading">${badge(t.type)}${badge(t.decision.status)}</div><h2>${esc(t.job.name)}</h2><p>${esc(t.job.destination) || 'Destination to be decided'}</p><p class="help">${o ? esc(o.start || 'Dates pending') + ' → ' + esc(o.end || 'Dates pending') : 'No preferred option selected'}<br>${a && !a.errors.length ? 'Planned travel: ' + range(a.low, a.high) : t.options.length + ' option(s) to review'}</p>${o && o.cancelBy && !['Completed', 'Declined', 'Cancelled'].includes(t.decision.status) ? `<p class="reminder">Cancellation deadline: ${esc(o.cancelBy)}${o.cancelBy < T.today() ? ' · date passed' : ''}</p>` : ''}<div class="actions">${btn('Open Trip', 'open', t.id, 'primary')}${btn('Duplicate', 'duplicate', t.id)}${btn(t.archived ? 'Restore to My Trips' : 'Archive', 'archive', t.id)}</div></article>`;
  }).join('') || '<div class="empty">No trips here yet. Choose Plan from Expense Book to begin with a scheduled inspection, or start a personal trip.</div>'}</div>`;
}
function workspace() {
  if (tab === 'pack' && !checklistEnabled()) tab = 'overview';
  const t = trip();
  if (!t) return `<div class="empty"><h2>Choose your next adventure</h2>${help('Open a saved trip from My Trips, or start one here.')}<div class="actions">${btn('Plan from Expense Book', 'import-inspection', '', 'primary')}${btn('+ Personal Trip', 'new', 'Personal')}${btn('Explore an Unscheduled Trip', 'new', 'Inspection')}</div></div>`;
  return `<div class="heading trip-title"><h2>${esc(t.job.name)}</h2><div class="actions">${badge(t.type)}${badge(t.decision.status)}${t.archived ? badge('Archived') : ''}${btn('Copy Planning Prompt', 'prompt')}${btn('Export Trip', 'export-trip')}</div></div><div class="tabs" aria-label="Trip sections">${[['overview', 'Overview'], ['compare', 'Compare Options'], ['options', 'Travel & Lodging'], ['decision', 'Decision & Notes'], ['daily', 'Daily Plan'], ['actual', 'Actual Costs'], ['pack', 'Departure Checklist'], ['handoff', 'Expense Book Handoff']].filter(([k]) => k !== 'pack' || checklistEnabled()).map(([k, l]) => btn(l, 'tab', k, tab === k ? 'active' : '')).join('')}</div>${t.handoff ? sourceWarning(t) : ''}<section class="panel">${{
    overview,
    compare,
    options,
    decision,
    daily,
    actualCosts,
    pack,
    handoff
  }[tab === 'actual' ? 'actualCosts' : tab]()}</section>`;
}
function overviewSummary(t) {
  if (t.type !== 'Inspection') return '';
  const q = T.num(t.job.quote),
    b = T.num(t.job.base);
  return `<div class="inline-stat"><span>Travel contribution</span><strong>${q === null || b === null ? '—' : money(q - b)}</strong><small>Quoted fee minus normal fee · not a spending ceiling</small></div>`;
}
function overview() {
  const t = trip(),
    j = t.job;
  return `<div class="grid">${t.handoff ? badge('Linked inspection') : field('type', 'Trip type', t.type, 'text', ['Inspection', 'Personal'], 'trip')}${t.handoff ? `<div><strong>${esc(j.name)}</strong><p>${esc(t.handoff.source.inspection.date)} · ${esc(t.handoff.source.inspection.outcome)}</p><p>${esc(j.destination)}</p><p>${esc(j.rv)}</p>${help('Inspection details come from Expense Book. Import a fresh handoff to update them.')}${btn('Plan Travel & Lodging', 'tab', 'options', 'primary')}</div>` : field('name', 'Trip name / customer', j.name) + field('destination', 'Destination / city', j.destination) + field('rv', 'RV / scope / trip purpose', j.rv)}${t.type === 'Inspection' ? (t.handoff ? `<div>Quoted inspection fee: ${j.quote === '' ? 'Not recorded' : money(Number(j.quote))}</div>` : field('quote', 'Quoted inspection fee ($)', j.quote, 'number')) + field('base', 'Normal inspection fee ($)', j.base, 'number') : field('budget', 'Optional travel budget ($)', j.budget, 'number')}${field('preferences', 'Your preferences / pet requirements', j.preferences, 'textarea')}${field('assumptions', 'Assumptions / things still to verify', j.assumptions, 'textarea')}</div><div id="overview-summary">${overviewSummary(t)}</div>${t.type === 'Inspection' ? help('Travel contribution = quoted fee minus normal fee. Remaining after entered travel costs is not net profit; inspection/report labor and other business expenses are not deducted.') : help('Personal trips compare travel costs and your optional budget. A blank budget is allowed.')}<details><summary>How this trip is planned</summary>${help('Each option is one complete trip scenario, with total miles and an entire lodging stay. Compare different dates, lodging, or van versus RV. This version does not build multi-stop routes or retrieve live rates. Defaults are copied when a new trip or option is created; existing entries keep their values.')}</details>`;
}
function metrics(t, o) {
  const c = T.calc(t, o);
  if (c.errors.length) return `<div class="notice"><strong>Incomplete estimate</strong><ul>${c.errors.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></div>`;
  return `<div class="metrics"><article><small>Planned travel incl. wear reserve</small><strong>${range(c.low, c.high)}</strong></article><article><small>${t.type === 'Inspection' ? 'Remaining from inspection fee' : 'Budget remaining'}</small><strong>${t.type === 'Inspection' ? range(c.remainLow, c.remainHigh) : range(c.budgetLow, c.budgetHigh)}</strong></article><article><small>${t.type === 'Inspection' ? 'Difference from normal fee' : 'Expected cash spending'}</small><strong>${t.type === 'Inspection' ? range(c.diffLow, c.diffHigh) : range(c.cashLow, c.cashHigh)}</strong></article></div>${help(`${c.n} lodging night(s) · ${c.n + 1} calendar day(s) away · Fuel ${range(c.fuelLow, c.fuelHigh)} (${range(c.fuelPriceLow, c.fuelPriceHigh)}/gallon) · Lodging ${money(c.lodging)} · Wear reserve ${money(c.wear)}.`)}`;
}
function compare() {
  const t = trip();
  return `<div class="heading"><h2>Compare the whole trip</h2><div class="actions">${btn('+ Van / Hotel', 'add-option', 'hotel')}${btn('+ Truck / RV', 'add-option', 'rv')}</div></div>${help('Blank required costs stay incomplete. Zero is valid when there is no cost. Your schedule, practical fit, and desire to travel matter alongside the money. No option is automatically accepted or rejected.')}<div class="table-wrap"><table><thead><tr><th>Option / dates</th><th>Planned travel</th><th>${t.type === 'Inspection' ? 'Remaining from fee' : 'Budget remaining'}</th><th>Readiness / preference</th><th>Next step</th></tr></thead><tbody>${t.options.map(o => {
    const c = T.calc(t, o);
    return `<tr><td><strong>${esc(o.name)}</strong>${o.id === t.decision.selected ? ' ' + badge('Preferred') : ''}<small>${esc(o.start || 'Start pending')} → ${esc(o.end || 'Return pending')}${t.type === 'Inspection' ? '<br>Inspect ' + esc(o.inspect || 'date pending') : ''}</small></td><td>${c.errors.length ? badge('Incomplete') : range(c.low, c.high)}</td><td>${c.errors.length ? '—' : t.type === 'Inspection' ? range(c.remainLow, c.remainHigh) : range(c.budgetLow, c.budgetHigh)}</td><td>${badge(o.lodgingStatus)}<small>Schedule: ${esc(o.schedule)}<br>Practical fit: ${esc(o.fit)}<br>${esc(o.desire)}</small></td><td>${btn('Edit', 'edit-option', o.id)}${btn(o.id === t.decision.selected ? 'Clear Preferred' : 'Choose Preferred', 'choose', o.id)}</td></tr>`;
  }).join('') || '<tr><td colspan="5">Add a travel option to begin comparing.</td></tr>'}</tbody></table></div>${t.type === 'Inspection' ? help('A negative difference from your normal fee means some travel cost is absorbed. It is not an automatic reason to decline a trip.') : ''}`;
}
function optionNav() {
  const t = trip(),
    o = opt();
  return `<div class="heading"><div class="tabs option-tabs">${t.options.map(x => btn(x.name, 'option', x.id, x.id === o?.id ? 'active' : '')).join('')}</div><div class="actions">${btn('+ Hotel', 'add-option', 'hotel')}${btn('+ RV', 'add-option', 'rv')}</div></div>`;
}
function options() {
  const t = trip(),
    o = opt();
  if (!o) return optionNav() + help('Add an option to enter travel details.');
  const f = (k, l, type = 'text', c = null) => field(k, l, o[k], type, c, 'option');
  return `${optionNav()}<div class="heading"><h2>Travel & Lodging</h2><div class="actions">${btn('Duplicate Option', 'copy-option', o.id)}${btn('Remove Option', 'remove-option', o.id)}</div></div><div class="grid">${f('name', 'Option / hotel / campground name')}${f('mode', 'Travel mode', 'text', ['hotel', 'rv'])}${f('start', 'Travel / check-in', 'date')}${t.type === 'Inspection' ? f('inspect', 'Inspection date', 'date') : ''}${f('end', 'Return / check-out', 'date')}${f('miles', 'Total miles, including local driving', 'number')}${f('mpgLow', 'MPG — low', 'number')}${f('mpgHigh', 'MPG — high', 'number')}${fuelFields(o, 'option')}${f('lodgingMode', 'Lodging cost method', 'text', ['total', 'nightly'])}${f('lodgingStatus', 'Lodging price status', 'text', ['Estimate', 'Quoted', 'Confirmed'])}</div><div class="grid">${o.lodgingMode === 'total' ? f('total', 'Entire stay incl. tax, pet fees, other fees ($)', 'number') : f('nightly', 'Nightly room / site rate ($)', 'number') + f('tax', 'Tax on nightly rate (%)', 'number') + f('pet', 'Pet fees for entire stay incl. tax ($)', 'number') + f('fees', 'Other lodging fees incl. tax ($)', 'number')}</div><details><summary>Meals, other costs & wear reserve</summary><div class="grid">${f('meals', 'Total meals ($)', 'number')}${f('other', 'Other trip costs: tolls, parking, etc. ($)', 'number')}${f('wear', 'Optional wear reserve ($ per mile)', 'number')}</div>${help('Wear reserve is separate from fuel. Do not enter an all-inclusive mileage reimbursement rate. Enter lodging fees only once.')}</details><details><summary>Schedule & practical fit</summary><div class="grid">${f('schedule', 'Schedule', 'text', ['Unconfirmed', 'Works', 'Does not work'])}${f('fit', 'Lodging / pet requirements', 'text', ['Unconfirmed', 'Works', 'Does not work'])}${f('breakfast', 'Breakfast included', 'text', ['Unknown', 'Yes', 'No', 'Not applicable'])}${f('suite', 'Couch / workspace', 'text', ['Unknown', 'Yes', 'No', 'Not applicable'])}${f('desire', 'Desire to take this trip', 'text', ['Neutral', 'Would enjoy', 'Prefer another option'])}${f('effort', 'Travel / setup effort')}</div></details><details><summary>Booking, contact & cancellation details</summary><div class="grid">${f('address', 'Full lodging address / ZIP')}${f('contact', 'Phone / contact')}${f('confirmation', 'Confirmation number')}${f('cancelBy', 'Cancellation deadline', 'date')}${f('terms', 'Cancellation time, timezone & terms', 'textarea')}${f('notes', 'Quote source, date, notes & open questions', 'textarea')}</div>${help('The deadline appears on the trip card and departure brief. This is an on-screen reminder, not a notification service. Record the cutoff time and timezone in the terms.')}</details><div id="live-results">${metrics(t, o)}</div>`;
}
function decision() {
  const t = trip();
  return `<div class="grid"><label>Preferred option<select data-scope="decision" data-key="selected"><option value="">Not chosen</option>${t.options.map(o => `<option value="${o.id}" ${o.id === t.decision.selected ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>${field('status', 'Trip status', t.decision.status, 'text', ['Exploring', 'Tentatively selected', 'Ready to offer date', 'Booked', 'Completed', 'Declined', 'Cancelled'], 'decision')}${field('notes', 'Decision rationale / next steps / who is doing what', t.decision.notes, 'textarea', null, 'decision')}</div>${help('Choosing a preferred option does not book anything. Mark Booked only after making your arrangements externally.')}<div class="actions">${btn('Print Departure Brief', 'brief')}${btn('Duplicate This Trip', 'duplicate', t.id)}${btn(t.archived ? 'Restore to My Trips' : 'Archive Trip', 'archive', t.id)}</div>`;
}
function actualCosts() {
  const t = trip();
  if (t.handoff?.source.version === 2 || t.tripExpenses) return itemizedCosts();
  const o = opt();
  if (!o) return help('Create an option first.');
  return `${optionNav()}<h2>What did this option actually cost?</h2>${help('Enter the total actually paid in each category, including tax and fees. Blank means not yet recorded; use zero when there was no cost. Actual cash spending excludes the optional wear reserve.')}<div class="grid">${[['actualFuel', 'Fuel'], ['actualLodging', 'Lodging incl. all fees'], ['actualMeals', 'Meals'], ['actualOther', 'Other: tolls, parking, etc.']].map(([k, l]) => field(k, l + ' ($)', o[k], 'number', null, 'option')).join('')}</div><div id="actual-results">${actualResults(t, o)}</div>`;
}
function actualResults(t, o) {
  const a = T.actual(o),
    c = T.calc(t, o);
  return `<div class="metrics"><article><small>${a.complete ? 'Actual cash spending' : 'Recorded so far · incomplete'}</small><strong>${money(a.known)}</strong></article><article><small>Estimated cash spending</small><strong>${c.errors.length ? 'Incomplete' : range(c.cashLow, c.cashHigh)}</strong></article><article><small>Actual minus estimated cash</small><strong>${a.complete && !c.errors.length ? range(a.known - c.cashHigh, a.known - c.cashLow) : '—'}</strong></article></div>${help('Positive variance means more spent than estimated. This tracks travel costs only; it does not update Expense Book or calculate business profit.')}`;
}
function pack() {
  const t = trip();
  return `<div class="heading"><h2>Before you head out</h2>${btn('Print Departure Brief', 'brief')}</div>${help('Defaults supply the starting checklist. Add or remove items for this trip; your other trips keep their own lists.')}<div class="checklist">${t.checklist.map(c => `<div><label><input type="checkbox" data-check="${c.id}" ${c.done ? 'checked' : ''}>${esc(c.label)}</label>${btn('Remove', 'remove-check', c.id)}</div>`).join('')}</div><div class="actions"><input id="new-check" aria-label="New checklist item" maxlength="500" placeholder="Add a reminder for this trip">${btn('Add Item', 'add-check')}</div>`;
}
function fuelRange(d, scope) {
  const price = T.num(d.fuel),
    allow = T.num(d.fuelAllowance === undefined ? scope === 'defaults' ? 0.10 : 0 : d.fuelAllowance);
  return price === null || allow === null || allow < 0 ? 'Enter a starting price and allowance to see the planning range.' : 'Planning range: ' + money(Math.max(0, price - allow)) + '–' + money(price + allow) + ' per gallon';
}
function fuelFields(d, scope) {
  return field('fuel', 'Starting fuel price ($ per gallon)', d.fuel, 'number', null, scope).replace('step="any"', 'step="0.01" list="fuel-price-choices"') + `<datalist id="fuel-price-choices">${Array.from({
    length: 81
  }, (_, i) => `<option value="${(1 + i * .1).toFixed(2)}"></option>`).join('')}</datalist>` + field('fuelAllowance', 'Price allowance ± ($ per gallon)', d.fuelAllowance === undefined ? scope === 'defaults' ? 0.10 : 0 : d.fuelAllowance, 'number', null, scope).replace('step="any"', 'step="0.05"') + `<div class="fuel-range" id="fuel-range">${fuelRange(d, scope)}</div>`;
}
function defaults() {
  const d = state.defaults,
    items = [['van', 'Van / Hotel'], ['rv', 'Truck / RV'], ['fuel', 'Fuel Price'], ['preferences', 'Preferences'], ...(checklistEnabled() ? [['checklist', 'Default Checklist']] : [])];
  if (!items.some(([k]) => k === defaultsTab)) defaultsTab = 'van';
  const f = (k, l, type = 'number') => field(k, l, d[k], type, null, 'defaults');
  const sections = {
    van: () => f('hotelMpgLow', 'Van / hotel MPG — low') + f('hotelMpgHigh', 'Van / hotel MPG — high'),
    rv: () => f('rvMpgLow', 'Truck / RV MPG — low') + f('rvMpgHigh', 'Truck / RV MPG — high'),
    fuel: () => fuelFields(d, 'defaults'),
    preferences: () => f('preferences', 'Lodging / pet / personal preferences', 'textarea'),
    checklist: () => f('checklist', 'Default checklist — one item per line', 'textarea')
  };
  return `<section class="panel"><h2>A head start for future trips</h2>${help('These values are copied into new trips and options. Updating defaults never changes trips already saved. Confirm the fuel price and actual route when planning each trip.')}<div class="tabs" aria-label="Travel default sections">${items.map(([k, l]) => btn(l, 'defaults-tab', k, k === defaultsTab ? 'active' : '')).join('')}</div><div class="settings-content"><h3>${items.find(([k]) => k === defaultsTab)[1]}</h3><div class="grid defaults-grid">${sections[defaultsTab]()}</div>${defaultsTab === 'fuel' ? help('Choose or enter a starting price and an allowance above and below it. Estimates combine this price range with your MPG range. The low price stops at $0. Prices are planning assumptions, not live route prices.') : ''}</div>${btn('Save Changes', 'save', '', 'primary')}</section>`;
}
function settings() {
  const sections = {
    backup: () => `${help('Export Current Copy includes all trips, defaults, and menu order, including changes still on screen. Restoring replaces this whole workspace after confirmation; export first.')}<div class="actions">${btn('Export Current Copy', 'backup', '', 'primary')}${btn('Restore Workspace JSON', 'restore')}${btn('Reload Saved Workspace', 'reload')}</div>${help('Data/trips.json is the live file. The last 10 previous saves are kept in Data/Backups. These are in the same folder, so also keep exported backups somewhere separate. Older automatic backups are removed only after a successful save.')}`,
    import: () => `${help('In your original HTML planner, choose Export trip file. Import that JSON here to add a separate inspection trip. Existing trips remain. Personal trips exported by this application also import.')}<div class="actions">${btn('Import Trip JSON', 'import')}</div>${help('This application cannot read another browser’s local storage. A portable HTML copy can be opened in your browser to export its trip JSON. Keep the original until you verify the imported trip.')}`,
    help: () => `${help('Run the application from its permanent folder. On each computer, install the desktop shortcut from that same folder. Each person gets a local browser session; both sessions use the same Data folder. Save before switching computers. If another session saves first, your stale save is blocked: export your current copy, reload, and reapply your changes.')}<p class="help">Use Exit RōM on each computer before updates. It stops only this local session. A browser tab can be closed afterward.</p>${help('The planner works offline. Distances, rates, reservations, and cancellation terms are entered by you. Planning figures are not tax deductions or an accounting ledger.')}`,
    display: () => `<label class="toggle-row"><input id="checklist-enabled" type="checkbox" ${checklistEnabled() ? 'checked' : ''}> Show Default Checklist and Departure Checklist</label>${help('Turn this on to show the checklist in Travel Defaults, Trip Workspace and printed departure briefs. Turning it off keeps all saved items and checkmarks. Save Changes to keep this preference on both computers.')}`
  };
  const items = [['backup', 'Backup & Recovery'], ['import', 'Import a Trip'], ['display', 'Optional Features'], ['help', 'Shared Folder & Help']];
  return `<section class="panel"><div class="tabs" aria-label="Backup and settings sections">${items.map(([k, l]) => btn(l, 'settings-tab', k, k === settingsTab ? 'active' : '')).join('')}</div><div class="settings-content"><h2>${items.find(([k]) => k === settingsTab)[1]}</h2>${sections[settingsTab]()}</div>${settingsTab === 'display' ? btn('Save Changes', 'save', '', 'primary') : ''}</section>`;
}
let dayId = '';
const currentDay = () => T.sortedDays(trip()).find(d => d.id === dayId) || T.sortedDays(trip())[0];
const preferred = () => trip()?.options.find(o => o.id === trip().decision.selected);
function dailyWarning(t, o) {
  const outside = T.outsideDays(t, o);
  return outside.length ? `<div class="notice">${outside.length} daily entry/entries fall outside the preferred option’s dates. They have been kept. Review their dates before printing or using the plan.</div>` : '';
}
function daily() {
  const t = trip(),
    days = T.sortedDays(t),
    d = currentDay();
  return `<div class="heading"><h2>A little structure, room to wander</h2><div class="actions">${btn('Create Days from Trip Dates', 'build-days')}${btn('+ Add Day', 'add-day')}${btn('Copy Planning Prompt', 'prompt')}</div></div>${help('One daily plan belongs to the whole trip. Create Days uses your preferred option and adds only missing dates. Changing options or dates never overwrites your schedule. Edit the day headings and blocks as plans develop.')}<div id="daily-warning">${dailyWarning(t, preferred())}</div><div class="day-tabs">${days.map(x => `<button data-act="day" data-id="${x.id}" class="${d?.id === x.id ? 'active' : ''}"><strong>${esc(x.date || 'Unscheduled')}</strong><span>${esc(x.title || 'Untitled day')}</span></button>`).join('')}</div>${d ? `<div class="heading"><h3 id="daily-day-title">${esc(d.date || 'Unscheduled')} · ${esc(d.title || 'Daily plan')}</h3>${btn('Remove Day', 'remove-day', d.id)}</div><div class="grid">${field('date', 'Date', d.date, 'date', null, 'day')}${field('title', 'Day heading', d.title, 'text', null, 'day')}${field('morning', 'Morning', d.morning, 'textarea', null, 'day')}${field('afternoon', 'Afternoon', d.afternoon, 'textarea', null, 'day')}${field('evening', 'Evening', d.evening, 'textarea', null, 'day')}${field('notes', 'Notes / addresses / things to confirm', d.notes, 'textarea', null, 'day')}</div>` : '<div class="empty">Choose a preferred option, then create days from its dates—or add an undated day while you explore.</div>'}<details><summary>Ideas to consider / pasted AI suggestions</summary>${help('Paste useful suggestions here, then move the parts you choose into your daily blocks. This scratchpad is saved with the trip but is not included in the departure brief or copied prompt.')}${field('planningIdeas', 'Suggestions scratchpad', t.planningIdeas || '', 'textarea', null, 'trip')}</details>`;
}
function dailyBrief(t, o) {
  const days = T.sortedDays(t);
  if (!days.length) return '';
  return `<section class="daily-brief"><h2>Daily Plan</h2>${dailyWarning(t, o)}${days.map(d => `<article><h3>${esc(d.date || 'Unscheduled')} · ${esc(d.title || 'Daily plan')}</h3>${['morning', 'afternoon', 'evening', 'notes'].map(k => d[k] ? `<div><strong>${{
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    notes: 'Notes / confirm'
  }[k]}</strong><p class="pre">${esc(d[k])}</p></div>` : '').join('') || help('Activities not yet recorded.')}</article>`).join('')}</section>`;
}
function promptDialog() {
  const t = trip();
  modal(`<div class="heading"><h2>Copy Planning Prompt</h2>${btn('Close', 'close')}</div>${help('Review or edit the text below, then copy it into your preferred AI chat. Nothing is sent from RōM. Selecting another option regenerates this preview; your trip stays unchanged.')}<label>Use this travel option<select id="prompt-option"><option value="">Choose an option</option>${t.options.map(o => `<option value="${o.id}" ${o.id === t.decision.selected ? 'selected' : ''}>${esc(o.name)}${o.id === t.decision.selected ? ' — preferred' : ''}</option>`).join('')}</select></label><label>Planning prompt<textarea id="planning-prompt" rows="16" spellcheck="false"></textarea></label><p id="copy-status" class="help" role="status"></p><div class="actions">${btn('Copy to Clipboard', 'copy-prompt', '', 'primary')}${btn('Select All Text', 'select-prompt')}</div>${help('After reviewing the AI response, paste useful suggestions into Daily Plan → Ideas to consider, or enter them directly into the day blocks. Customer/trip name, contact details, booking confirmations, and the suggestions scratchpad are not automatically added to this prompt.')}`);
  updatePrompt();
}
function updatePrompt() {
  const o = trip().options.find(x => x.id === $('#prompt-option').value);
  $('#planning-prompt').value = o ? T.planningPrompt(trip(), o) : '';
  $('#copy-status').textContent = o ? 'Ready to review and copy.' : 'Select the option you want help planning.';
  $('#dialog [data-act="copy-prompt"]').disabled = !o;
}
async function copyPrompt() {
  const area = $('#planning-prompt');
  if (!area.value) return;
  try {
    if (!navigator.clipboard?.writeText) throw Error();
    await navigator.clipboard.writeText(area.value);
    $('#copy-status').textContent = 'Copied. Paste into your AI chat when ready.';
  } catch (e) {
    area.focus();
    area.select();
    $('#copy-status').textContent = 'Automatic copy is unavailable. The prompt is selected; press Ctrl+C (or Command+C) to copy.';
  }
}
function brief() {
  const t = trip(),
    o = t?.options.find(o => o.id === t.decision.selected);
  if (!t) return;
  if (!o) {
    note('Choose a preferred option in Compare Options or Decision & Notes before printing a departure brief.', true);
    return;
  }
  const c = T.calc(t, o),
    rows = [['Destination', t.job.destination], ['Purpose / RV', t.job.rv], ['Trip dates', o.start + ' → ' + o.end], ...(t.type === 'Inspection' ? [['Inspection date', o.inspect]] : []), ...(t.handoff ? [['Latest Expense Book date', t.handoff.source.inspection.date], ['Visit status', t.handoff.source.inspection.outcome], ['Customer contacts', t.handoff.source.inspection.contacts], ['VIN', t.handoff.source.inspection.vin], ['Inspection / visit notes', t.handoff.source.inspection.notes]] : []), ['Lodging', o.name], ['Address / ZIP', o.address], ['Contact', o.contact], ['Confirmation', o.confirmation], ['Cancellation deadline', o.cancelBy], ['Cancellation terms', o.terms]];
  modal(`<div class="no-print heading"><h2>Departure Brief</h2><div class="actions">${btn('Print / Save PDF', 'print')}${btn('Close', 'close')}</div></div><div class="print-heading"><img src="/travel-planner.svg" alt=""><div><h1>${esc(t.job.name)}</h1><p>${esc(t.type)} · ${esc(t.decision.status)} · Prepared ${T.today()}${dirty ? ' · includes unsaved changes' : ''}</p></div></div><div class="brief-grid">${rows.map(([l, v]) => `<div><strong>${esc(l)}</strong><p class="pre">${esc(v) || 'Not recorded'}</p></div>`).join('')}</div>${t.handoff ? sourceWarning(t) : ''}<h2>Travel estimate</h2>${metrics(t, o)}${c.errors.length ? '' : help('Entered estimates only. Remaining amounts are not business profit.')}<div class="brief-grid"><div><h2>Preferences & assumptions</h2><p class="pre">${esc(t.job.preferences)}</p><p class="pre">${esc(t.job.assumptions)}</p></div><div><h2>Booking notes & next steps</h2><p class="pre">${esc(o.notes)}</p><p class="pre">${esc(t.decision.notes)}</p></div></div>${dailyBrief(t, o)}${checklistEnabled() ? `<h2>Pack & confirm</h2><div class="brief-checks">${t.checklist.map(c => `<div>${c.done ? '☑' : '☐'} ${esc(c.label)}</div>`).join('') || '<p>No checklist items recorded.</p>'}</div>` : ''}<h2>On the road / call notes</h2><div class="writing-lines"></div><p class="help">Developed by <strong>Double Diamond Labs</strong> - Adventure On!</p>`, 'brief');
}
let pendingInspection = null;
function sourceWarning(t) {
  const i = t.handoff.source.inspection,
    changed = t.options.some(o => o.inspect !== i.date);
  return changed || i.outcome !== 'Scheduled' ? `<div class="notice"><strong>Review the linked visit</strong><p>Expense Book: ${esc(i.date)} · ${esc(i.outcome)}.${changed ? ' One or more travel options use a different inspection date. Review your travel dates, reservations and daily plan; they were kept unchanged.' : ''}</p></div>` : '';
}
function handoff() {
  const t = trip(),
    h = t.handoff;
  if (!h) return `<h2>Connect a scheduled inspection</h2>${help('Start in Expense Book → Business Workspace → Inspections & Income → RōM · Inspection Travel. Export the specific visit, then import the JSON here to create its linked trip. Existing unlinked trips remain separate.')}${btn('Import from Expense Book', 'import-inspection')}`;
  const i = h.source.inspection;
  return `<div class="heading"><h2>Inspection & Trip Handoff</h2>${btn('Refresh from Expense Book', 'import-inspection')}</div>${help('Expense Book owns the inspection record. RōM keeps your lodging options, daily plan and checklist. Refreshing imports the latest inspection details without moving your travel dates.')}<div class="grid"><div><strong>${esc(i.name)}</strong><p>${esc(i.date)} · ${esc(i.purpose)} · ${esc(i.outcome)}</p><p>${esc(i.destination)}</p><p>${esc(i.rv)} · VIN: ${esc(i.vin) || 'Not recorded'}</p><p>Recorded miles in Expense Book: ${esc(i.miles ?? 'Not recorded')}</p></div><details><summary>Customer Contacts & Inspection Notes</summary><p class="pre">${esc(i.contacts)}</p><p class="pre">${esc(i.notes)}</p></details></div><h3>Bring the actual trip back</h3>${help('Enter only the actual miles attributable to this visit, excluding personal detours. This field is separate from each option’s planned mileage and will replace—not add to—the visit’s recorded mileage. Leave it blank to return notes only.')}<div class="grid">${field('actualMiles', 'Confirmed actual visit miles', h.actualMiles, 'number', null, 'handoff')}${field('notes', 'Selected trip notes to send back (up to 3,000 characters)', h.notes, 'textarea', null, 'handoff')}</div>${t.handoff.source.version === 2 ? `<p class="help">${(t.tripExpenses || []).length} itemized expense(s). Add or edit them under Actual Costs; choose which to send in the return preview.</p>${btn('Review Itemized Expenses', 'tab', 'actual')}` : help('Refresh from Expense Book 3.32.47 or newer to load its categories and enable itemized expense returns.')}${btn('Preview Return to Expense Book', 'return-preview', '', 'primary')}${help('Return confirmed mileage, selected notes and itemized expenses. Payments, reservations and inspection status stay in their own application. Expense Book previews expenses and flags possible duplicates before saving. Save Changes before exporting a return file. Personal trips cannot be returned.')}`;
}
async function importInspectionFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    try {
      const f = input.files[0];
      if (!f) return;
      if (f.size > 1024 * 1024) throw Error('Transfer file is too large.');
      const p = JSON.parse(await f.text()),
        r = T.importInspection(state, p),
        i = p.inspection;
      pendingInspection = p;
      modal(`<div class="heading"><h2>${r.existing ? 'Refresh Linked Trip' : 'Import Scheduled Inspection'}</h2>${btn('Cancel', 'close')}</div><h3>${esc(i.name)}</h3><p>${esc(i.date)} · ${esc(i.purpose)} · ${esc(i.outcome)}</p><p>${esc(i.destination)}</p><p>${esc(i.rv)} · VIN: ${esc(i.vin) || 'Not recorded'}</p><p>Quoted fee: ${i.quote === null ? 'Not recorded' : money(i.quote)} · Recorded miles: ${esc(i.miles ?? 'Not recorded')}</p><details><summary>Contacts & Notes Included</summary><p class="pre">${esc(i.contacts)}</p><p class="pre">${esc(i.notes)}</p></details>${help(r.unchanged ? 'This exact handoff is already loaded. Open the existing trip.' : r.existing ? 'This refreshes the same linked trip, including an archived trip. Travel options, bookings, actuals, daily plan and checklist remain unchanged.' : 'This creates one linked inspection trip. Travel dates and estimates still need your input.')}${r.rescheduled ? '<div class="notice">The inspection date changed. Review existing travel dates and reservations after importing.</div>' : ''}<div class="actions">${btn(r.unchanged ? 'Open Linked Trip' : r.existing ? 'Apply Inspection Refresh' : 'Import Inspection', 'apply-inspection', '', 'primary')}</div>`);
    } catch (e) {
      note(e.message, true);
    }
  };
  input.click();
}
async function applyInspection() {
  if (!pendingInspection) return;
  busy = true;
  $('#dialog').inert = true;
  try {
    const r = T.importInspection(state, pendingInspection);
    await api('validate', {
      state: r.next
    });
    state = r.next;
    active = r.id;
    page = 'workspace';
    tab = 'overview';
    optionId = '';
    if (!r.unchanged) mark();
    closeModal();
    note(r.unchanged ? 'Opened the existing linked trip.' : 'Inspection loaded. Review the details, then Save Changes.');
    pendingInspection = null;
  } catch (e) {
    closeModal();
    note(e.message, true);
  } finally {
    busy = false;
    $('#dialog').inert = false;
    render();
  }
}
function returnPreview() {
  if (dirty) throw Error('Save Changes before preparing a return file.');
  const t = trip(),
    h = t.handoff,
    rows = t.tripExpenses || [],
    ready = rows.filter(x => !T.expenseProblem(t, x));
  T.tripResults(t, h.actualMiles !== '', !!h.notes.trim(), ready.map(x => x.id));
  modal(`<div class="heading"><h2>Return to Expense Book</h2>${btn('Cancel', 'close')}</div><h3>${esc(h.source.inspection.name)}</h3><p>${esc(h.source.inspection.date)} · ${esc(h.source.inspection.purpose)}</p><label><input id="return-miles" type="checkbox" ${h.actualMiles !== '' ? 'checked' : 'disabled'}> Replace this visit’s mileage with ${h.actualMiles === '' ? 'no mileage entered' : esc(h.actualMiles) + ' actual miles'}</label><label><input id="return-notes" type="checkbox" ${h.notes.trim() ? 'checked' : 'disabled'}> Append these selected notes</label><p class="pre">${esc(h.notes) || 'No notes selected'}</p>${h.source.version === 2 ? `<h3>Itemized Business Expenses</h3>${help('Select receipts to send. Expense Book will block already-imported items and flag possible matches to existing expenses. Only itemized entries transfer; older lump-sum totals are reference only.')}<div class="table-wrap"><table><thead><tr><th>Send</th><th>Date / Payee</th><th>Expense Book category</th><th>Amount</th></tr></thead><tbody>${rows.map(x => {
    const problem = T.expenseProblem(t, x);
    return `<tr><td><input type="checkbox" data-return-expense="${esc(x.id)}" aria-label="Send ${esc(x.payee)}" ${problem ? 'disabled' : 'checked'}></td><td>${esc(x.date)} · ${esc(x.payee)}<small>${esc(x.description)}</small>${problem ? `<p class="error">${esc(problem)}</p>` : ''}</td><td>${esc(x.category)}${x.subCategory ? ' / ' + esc(x.subCategory) : ''}</td><td>${T.num(x.amount) === null ? 'Not entered' : money(Number(x.amount))}</td></tr>`;
  }).join('') || '<tr><td colspan="4">No itemized expenses entered.</td></tr>'}</tbody></table></div>` : ''}${help('Download the JSON, then use Import Travel from RōM in Expense Book. No workbook changes happen here. If the inspection changed since export, Expense Book will ask for a fresh handoff.')}${btn('Download Return File', 'download-return', '', 'primary')}`);
}
function downloadReturn() {
  const ids = [...document.querySelectorAll('[data-return-expense]:checked')].map(e => e.dataset.returnExpense),
    p = T.tripResults(trip(), $('#return-miles').checked, $('#return-notes').checked, ids);
  download('RoM-to-Expense-Book-' + trip().handoff.source.inspection.date + '-' + p.linkId.slice(0, 8) + '.json', p);
  closeModal();
  note('Return file downloaded. Open it in Expense Book to preview and apply.');
}
let expenseId = '';
const currentExpense = () => trip()?.tripExpenses?.find(x => x.id === expenseId);
function itemizedSummary(t) {
  const a = T.expenseTotals(t),
    o = preferred(),
    c = o && T.calc(t, o);
  return `<div class="metrics"><article><small>${a.complete ? 'Itemized actual spending' : 'Itemized spending so far'}</small><strong>${money(a.total)}</strong></article><article><small>Preferred option · estimated cash</small><strong>${c && !c.errors.length ? range(c.cashLow, c.cashHigh) : 'Choose / complete a preferred option'}</strong></article><article><small>Actual minus estimate</small><strong>${a.complete && c && !c.errors.length ? range(a.total - c.cashHigh, a.total - c.cashLow) : 'Finish entering receipts to compare'}</strong></article></div><div class="cards">${a.groups.map(g => `<div class="inline-stat"><span>${esc(g.name)}</span><strong>${money(g.total)}</strong></div>`).join('')}</div>${a.incomplete ? help(a.incomplete + ' expense(s) still need details before they can transfer.') : ''}`;
}
function expenseEditor(t, x) {
  if (!x) return '';
  const cats = T.expenseCategories(t, x.date),
    c = cats.find(c => c.name === x.category),
    select = (key, label, items) => `<label>${label}<select data-scope="expense" data-key="${key}"><option value="">Choose ${key === 'category' ? 'category' : 'subcategory (optional)'}</option>${x[key] && !items.includes(x[key]) ? `<option value="${esc(x[key])}" selected>${esc(x[key])} — refresh / reselect</option>` : ''}${items.map(n => `<option value="${esc(n)}" ${x[key] === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  return `<section class="panel"><div class="heading"><h3>Trip Expense</h3>${btn('Done Editing', 'done-expense')}</div><div class="grid">${field('date', 'Date paid', x.date, 'date', null, 'expense')}${field('payee', 'Payee / business name', x.payee, 'text', null, 'expense')}${field('description', 'Description / what was purchased', x.description, 'text', null, 'expense')}${field('amount', 'Amount paid ($)', x.amount, 'number', null, 'expense')}${t.handoff ? select('category', 'Expense Book category', cats.map(c => c.name)) + select('subCategory', 'Expense Book subcategory', c?.subs || []) : field('category', 'Category', x.category, 'text', null, 'expense') + field('subCategory', 'Subcategory', x.subCategory, 'text', null, 'expense')}</div>${t.handoff && !cats.length ? help('No categories loaded for this expense year. Link that year in Expense Book, then export and refresh this trip.') : ''}<p id="expense-problem" class="help">${esc(T.expenseProblem(t, x) || 'Ready for the return preview. Save Changes to keep this receipt.')}</p></section>`;
}
function itemizedCosts() {
  const t = trip(),
    rows = t.tripExpenses || [],
    old = t.options.filter(o => ['actualFuel', 'actualLodging', 'actualMeals', 'actualOther'].some(k => o[k] !== ''));
  return `<div class="heading"><h2>Itemized Trip Expenses</h2><div class="actions">${btn('+ Add Trip Expense', 'add-expense', '', 'primary')}${t.handoff ? btn('Preview Return to Expense Book', 'return-preview') : ''}</div></div>${help('Enter each receipt once for the whole trip. Use the business amount you want recorded in Expense Book, with its date, payee, description and category. Split mixed purchases into separate entries as needed. These are recorded costs, not calculated tax deductions. Refunds should be recorded directly in Expense Book.')}<div id="itemized-summary">${itemizedSummary(t)}</div><label class="help"><input id="expenses-complete" type="checkbox" ${t.expensesComplete ? 'checked' : ''}> All trip expenses have been entered</label>${expenseEditor(t, currentExpense())}<div class="table-wrap"><table><thead><tr><th>Date / Payee</th><th>Expense Book category</th><th>Amount</th><th>Review</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.date)} · ${esc(x.payee) || 'Payee needed'}<small>${esc(x.description)}</small></td><td>${esc(x.category) || 'Category needed'}${x.subCategory ? ' / ' + esc(x.subCategory) : ''}</td><td>${T.num(x.amount) === null ? 'Not entered' : money(Number(x.amount))}</td><td>${btn('Edit', 'edit-expense', x.id)}${btn('Remove', 'remove-expense', x.id)}<small>${esc(T.expenseProblem(t, x) || 'Ready to send')}</small></td></tr>`).join('') || '<tr><td colspan="4">Add a receipt to begin. Estimates and older total fields do not create expenses.</td></tr>'}</tbody></table></div>${old.length ? `<details><summary>Previous Lump-Sum Totals · Reference Only</summary>${help('These values were entered before itemized expenses. They are preserved but excluded from the totals above and from transfers. Use them to check your receipts; no automatic conversion occurs.')}<div class="table-wrap"><table><thead><tr><th>Option</th><th>Fuel</th><th>Lodging</th><th>Meals</th><th>Other</th></tr></thead><tbody>${old.map(o => `<tr><td>${esc(o.name)}</td>${['actualFuel', 'actualLodging', 'actualMeals', 'actualOther'].map(k => `<td>${o[k] === '' ? 'Not entered' : money(Number(o[k]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>` : ''}`;
}
async function importFile(kind) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    try {
      const f = input.files[0];
      if (!f) return;
      if (f.size > 16 * 1024 * 1024) throw Error('File too large.');
      const raw = JSON.parse(await f.text());
      let next;
      if (kind === 'restore') {
        if (!confirm('Replace the entire workspace? Export your current copy first if you need to retain it.')) return;
        next = raw;
      } else {
        next = structuredClone(state);
        const t = T.importTrip(raw);
        next.trips.push(t);
      }
      busy = true;
      $('#app').inert = true;
      await api('validate', {
        state: next
      });
      state = next;
      if (kind === 'import') {
        active = next.trips.at(-1).id;
        tab = 'overview';
        page = 'workspace';
      } else {
        active = '';
        page = 'trips';
      }
      mark();
      note('Loaded and validated. Review, then Save Changes to keep this ' + (kind === 'import' ? 'trip.' : 'workspace.'));
    } catch (e) {
      note('Could not import: ' + e.message, true);
    } finally {
      busy = false;
      render();
    }
  };
  input.click();
}
document.addEventListener('input', e => {
  if (busy || !state) return;
  const el = e.target;
  if (el.id === 'checklist-enabled') {
    state.defaults.checklistEnabled = el.checked;
    mark();
    render();
    return;
  }
  if (el.id === 'expenses-complete') {
    trip().expensesComplete = el.checked;
    mark();
    $('#itemized-summary').innerHTML = itemizedSummary(trip());
    return;
  }
  if (el.id === 'prompt-option') {
    updatePrompt();
    return;
  }
  if (el.id === 'search') {
    search = el.value;
    const pos = el.selectionStart;
    render();
    $('#search').focus();
    $('#search').setSelectionRange(pos, pos);
    return;
  }
  if (el.dataset.check) {
    const c = trip().checklist.find(c => c.id === el.dataset.check);
    if (c) {
      c.done = el.checked;
      mark();
    }
    return;
  }
  const k = el.dataset.key,
    s = el.dataset.scope;
  if (!k) return;
  if (s === 'expense') {
    const x = currentExpense();
    if (!x) return;
    x[k] = el.value;
    trip().expensesComplete = false;
    if (k === 'category') {
      x.subCategory = '';
      x.bucket = /fuel/i.test(x.category) ? 'Fuel' : /lodg|hotel|camp/i.test(x.category) ? 'Lodging' : /food|meal/i.test(x.category) ? 'Meals' : 'Other';
    }
    mark();
    if (['category', 'date'].includes(k)) render();else {
      if ($('#expense-problem')) $('#expense-problem').textContent = T.expenseProblem(trip(), x) || 'Ready for the return preview. Save Changes to keep this receipt.';
      if ($('#itemized-summary')) $('#itemized-summary').innerHTML = itemizedSummary(trip());
      if ($('#expenses-complete')) $('#expenses-complete').checked = false;
    }
    return;
  }
  const obj = s === 'handoff' ? trip()?.handoff : s === 'job' ? trip()?.job : s === 'trip' ? trip() : s === 'decision' ? trip()?.decision : s === 'option' ? opt() : s === 'day' ? currentDay() : s === 'defaults' ? state.defaults : null;
  if (s === 'trip' && k === 'planningIdeas' && obj && !Object.hasOwn(obj, k)) obj.planningIdeas = '';
  if (obj && ['defaults', 'option'].includes(s) && k === 'fuelAllowance' && !Object.hasOwn(obj, k)) obj[k] = s === 'defaults' ? 0.10 : 0;
  if (!obj || !Object.hasOwn(obj, k)) return;
  obj[k] = el.value;
  mark();
  if (['defaults', 'option'].includes(s) && ['fuel', 'fuelAllowance'].includes(k) && $('#fuel-range')) $('#fuel-range').textContent = fuelRange(obj, s);
  if (s === 'day') {
    dayId = obj.id;
    if ($('#daily-day-title')) $('#daily-day-title').textContent = (obj.date || 'Unscheduled') + ' · ' + (obj.title || 'Daily plan');
    if ($('#daily-warning')) $('#daily-warning').innerHTML = dailyWarning(trip(), preferred());
    const b = $(`[data-act="day"][data-id="${obj.id}"]`);
    if (b) {
      b.querySelector('strong').textContent = obj.date || 'Unscheduled';
      b.querySelector('span').textContent = obj.title || 'Untitled day';
    }
    return;
  }
  if ($('#overview-summary')) $('#overview-summary').innerHTML = overviewSummary(trip());
  if (['type', 'lodgingMode'].includes(k)) render();else {
    if ($('#live-results')) $('#live-results').innerHTML = metrics(trip(), opt());
    if ($('#actual-results')) $('#actual-results').innerHTML = actualResults(trip(), opt());
  }
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || busy || !state) return;
  const {
    act,
    id
  } = b.dataset;
  try {
    if (act === 'defaults-tab') {
      defaultsTab = id;
      render();
      return;
    }
    if (act === 'settings-tab') {
      settingsTab = id;
      render();
      return;
    }
    if (act === 'add-expense') {
      const t = trip();
      if ((t.tripExpenses || []).length >= 500) throw Error('Limit: 500 itemized expenses per trip.');
      const x = T.expense(t);
      (t.tripExpenses ||= []).push(x);
      expenseId = x.id;
      t.expensesComplete = false;
      mark();
      render();
      return;
    }
    if (act === 'edit-expense') {
      expenseId = id;
      render();
      return;
    }
    if (act === 'done-expense') {
      expenseId = '';
      render();
      return;
    }
    if (act === 'remove-expense') {
      if (!confirm('Remove this receipt from RōM? This does not remove any expense already imported into Expense Book.')) return;
      trip().tripExpenses = trip().tripExpenses.filter(x => x.id !== id);
      trip().expensesComplete = false;
      expenseId = '';
      mark();
      render();
      return;
    }
    if (act === 'import-inspection') {
      await importInspectionFile();
      return;
    }
    if (act === 'apply-inspection') {
      await applyInspection();
      return;
    }
    if (act === 'return-preview') {
      returnPreview();
      return;
    }
    if (act === 'download-return') {
      downloadReturn();
      return;
    }
    if (act === 'prompt') {
      promptDialog();
      return;
    }
    if (act === 'copy-prompt') {
      await copyPrompt();
      return;
    }
    if (act === 'select-prompt') {
      $('#planning-prompt').focus();
      $('#planning-prompt').select();
      return;
    }
    if (act === 'day') dayId = id;
    if (act === 'add-day') {
      const t = trip();
      if ((t.dailyPlan || []).length >= 366) throw Error('Limit: 366 days per trip.');
      const d = T.day();
      (t.dailyPlan ||= []).push(d);
      dayId = d.id;
      mark();
    }
    if (act === 'build-days') {
      const t = trip(),
        days = T.missingDays(t, preferred());
      (t.dailyPlan ||= []).push(...days);
      if (days.length) {
        dayId = days[0].id;
        mark();
        note('Added ' + days.length + ' day(s). Existing entries have been kept.');
      } else note('All dates already have daily entries. Your plan is unchanged.');
    }
    if (act === 'remove-day') {
      if (!confirm('Remove this day and its notes?')) return;
      trip().dailyPlan = trip().dailyPlan.filter(d => d.id !== id);
      dayId = '';
      mark();
    }
    if (act === 'save') return await save();
    if (act === 'backup') {
      exportAll();
      return;
    }
    if (act === 'exit') {
      if (dirty && !confirm('There are unsaved changes. Exit without saving? Cancel to Save Changes or Export Current Copy.')) return;
      await api('exit', {});
      dirty = false;
      $('#app').innerHTML = '<main><h1>RōM has closed.</h1><p>You can close this browser tab. Start again using your desktop shortcut.</p></main>';
      return;
    }
    if (act === 'reload') {
      if (dirty && !confirm('Discard changes on screen and reload the saved workspace?')) return;
      await load();
      note('Reloaded the saved workspace.');
      return;
    }
    if (act === 'close') {
      closeModal();
      return;
    }
    if (act === 'print') {
      window.print();
      return;
    }
    if (act === 'brief') {
      brief();
      return;
    }
    if (act === 'restore' || act === 'import') {
      await importFile(act);
      return;
    }
    if (act === 'nav') page = id;
    if (act === 'collapse') collapsed = !collapsed;
    if (act === 'filter') filter = id;
    if (act === 'tab') tab = id;
    if (act === 'option') {
      optionId = id;
    }
    if (act === 'new') {
      const t = T.trip(id, state.defaults);
      state.trips.push(t);
      active = t.id;
      optionId = t.options[0].id;
      page = 'workspace';
      tab = 'overview';
      mark();
    }
    if (act === 'open') {
      active = id;
      optionId = '';
      page = 'workspace';
      tab = 'overview';
    }
    if (act === 'archive') {
      const t = state.trips.find(x => x.id === id);
      t.archived = !t.archived;
      mark();
    }
    if (act === 'duplicate') {
      const t = T.duplicate(state.trips.find(x => x.id === id));
      state.trips.push(t);
      active = t.id;
      optionId = '';
      tab = 'overview';
      page = 'workspace';
      mark();
      note('Trip duplicated. Dates, daily plans, costs and notes were retained for review; booking confirmation, actual costs and checklist completion were reset.');
    }
    if (act === 'edit-option') {
      optionId = id;
      tab = 'options';
    }
    if (act === 'choose') {
      trip().decision.selected = trip().decision.selected === id ? '' : id;
      mark();
    }
    if (act === 'add-option') {
      const t = trip();
      if (t.options.length >= 100) throw Error('Limit: 100 options per trip.');
      const o = T.option(id, state.defaults);
      if (t.options[0]) for (const k of ['start', 'inspect', 'end', 'miles', 'fuel', 'fuelAllowance']) o[k] = k === 'fuelAllowance' ? t.options[0][k] ?? 0 : t.options[0][k];
      t.options.push(o);
      optionId = o.id;
      tab = 'options';
      mark();
    }
    if (act === 'copy-option') {
      if (trip().options.length >= 100) throw Error('Limit: 100 options per trip.');
      const o = structuredClone(opt());
      o.id = T.uid();
      o.name += ' (copy)';
      for (const k of ['confirmation', 'cancelBy', 'actualFuel', 'actualLodging', 'actualMeals', 'actualOther']) o[k] = '';
      o.lodgingStatus = 'Estimate';
      o.schedule = o.fit = 'Unconfirmed';
      trip().options.push(o);
      optionId = o.id;
      mark();
    }
    if (act === 'remove-option') {
      if (!confirm('Remove this option, including its booking details and actual costs?')) return;
      trip().options = trip().options.filter(o => o.id !== id);
      if (trip().decision.selected === id) trip().decision.selected = '';
      optionId = '';
      mark();
    }
    if (act === 'export-trip') {
      const {
        handoff,
        ...portable
      } = trip();
      download(safeName(trip().job.name) + '.json', {
        ...portable,
        version: 1
      });
      return;
    }
    if (act === 'add-check') {
      const label = $('#new-check').value.trim();
      if (!label) return;
      if (trip().checklist.length >= 200) throw Error('Limit: 200 checklist items.');
      trip().checklist.push({
        id: T.uid(),
        label,
        done: false
      });
      mark();
    }
    if (act === 'remove-check') {
      trip().checklist = trip().checklist.filter(c => c.id !== id);
      mark();
    }
    if (act === 'arrange') {
      modal('<h2>Arrange Menu</h2>' + state.navigation.map((k, i) => `<div class="heading"><span>${esc(titles[k])}</span><div>${i ? btn('↑', 'move-menu', k + '|-1') : ''}${i < 3 ? btn('↓', 'move-menu', k + '|1') : ''}</div></div>`).join('') + help('Close, then Save Changes to keep the order.') + btn('Close', 'close'));
      return;
    }
    if (act === 'move-menu') {
      const [k, n] = id.split('|'),
        a = state.navigation,
        i = a.indexOf(k),
        j = i + Number(n);
      if (j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]];
      mark();
      closeModal();
      render();
      document.querySelector('[data-act="arrange"]').click();
      return;
    }
    render();
  } catch (e) {
    note(e.message, true);
  }
});
window.addEventListener('beforeunload', e => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
load().catch(e => {
  $('#app').innerHTML = '<main><h1>Could not open the saved workspace</h1><p>' + esc(e.message) + '</p><p>Keep your Data folder. See START-HERE.txt for recovery instructions.</p></main>';
});
