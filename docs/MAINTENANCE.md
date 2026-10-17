# Maintaining RōM

Current baseline: **0.1.8**. Automated checks pass; the user's Windows/network-share
and print-preview checks are the final real-environment pilot.

This is a separate app from Expense Book and SEO Genie. It borrows their local
Python/browser pattern and visual preferences. Never point it at either app's
Data folder. Never write to an Expense Book workbook as a side effect.

## What must remain true

- Run offline, local loopback only. No required APIs, online map/rate services,
  credentials, publishing, analytics, CDN assets, or subscription dependency.
- Preserve old HTML version-1 trip JSON import. Inspect source before changing
  mappings. New imports get fresh IDs and add a trip; full workspace restore is
  separate and explicitly replaces all state after confirmation.
- Do not use browser storage for authoritative trip data.
- Data/trips.json is authoritative. Saves need validation, exclusive create lock,
  revision comparison under that lock, previous-state backup, a flushed temporary
  file in the same directory, then os.replace. Keep failed edits exportable.
- Retain the last 10 previous-save JSON files. Prune only after commit. Never prune
  exported user backups or arbitrary files outside Data/Backups.
- Never auto-remove a potentially live lock. Recovery requires both local servers
  stopped. Network filesystems must support the locking/replace operations.
- Blank required cost is incomplete, not zero. Personal budgets are optional.
  Inspection dates must be within the whole-trip date range. Calendar days must
  not drift at daylight-saving transitions.
- Wear reserve is not actual cash spending. Remaining revenue is not profit.
  Keep the user's preferences and schedule visible alongside costs.
- All user text is escaped. Server validates restored data and caps request sizes.
  The server uses Host checks and a per-process token on POSTs; no wildcard CORS.
- Defaults affect only new trips/options. Duplication resets actuals and booking
  confirmation but deliberately retains notes/dates with a review notice.
- Print the full departure brief with natural overflow; don't clip notes to fit
  an arbitrary page count. Keep print controls outside the printed sheet.

## Building a release

Work in a separate development folder. Start with synthetic trips. Read
START-HERE.txt and the source listed in README before changing behavior.
Run npm install once for development-only jsdom. Run python build_release.py to
check and package. You may set PLANNER_JSDOM to an existing jsdom module path in
an isolated test environment; end users never need it.

App ZIP: root application scripts and web assets plus START-HERE.txt.
Repository ZIP: app/ source, tests, docs, .gitignore, .gitattributes, package.json,
and build_release.py. Both include RELEASE-MANIFEST.json with hashes. No Data.
The builder uses explicit allowlists; keep that property.

Bump VERSION in build_release.py and visible version strings in planner.py,
web/app.js, README and START-HERE. Keep schema version separate from release
version. Change schema only with an explicit migration and backup tests.

Safe practice change: edit a help sentence in web/app.js, build, run the new app
in a development folder, verify it, then discard the development Data. Do not
rehearse on the live shared folder.

## Current scope / known limits

Each option represents a full trip and one lodging total; no multi-stop route
engine. Values are manually researched. Actual costs track travel only. There
are no receipts/photos/uploads, live connections, shared real-time editing,
automatic merge, background notifications, or permanent trip deletion UI.
Archive retains the trip. Saved plans are explicit, not background autosave.
Changing trip type preserves hidden fee/date fields so switching back is safe.
Status and date reminders are descriptive, not an automated booking service.

DOM tests exercise navigation and actions, not browser rendering. Native Windows
shortcuts, SMB error semantics, and print layout should be checked by the user.

## Ready-to-paste handoff

Continue RōM from this repository package. Keep it offline,
separate from Expense Book, and safe for two users on a shared Windows folder.
Preserve old trip imports, existing data, explicit saves, atomic writes,
conflict checks, backups, and recovery instructions. Match the compact navy
sidebar, horizontal tabs and collapsible sections. Requested change: [describe].
Deliver a tested app ZIP and matching repository ZIP with simple install steps.
Use synthetic data. Explain any remaining native Windows/print checks honestly.

## Daily Plan and prompt additions (0.1.8)
Optional trip fields `dailyPlan` (max 366) and `planningIdeas` (text) keep older
backups valid. Each day has id, date, title, morning, afternoon, evening, notes.
Dated entries are unique per trip; blank dates support unscheduled ideas.
UTC day arithmetic builds missing dates without replacing any existing entry.
Date/option changes only flag out-of-range entries; they do not delete or redate.
Trip duplication and individual JSON import regenerate day IDs and retain text.

The prompt is a local text formatter in domain.js, not an AI API integration.
It uses an explicitly selected option, labels missing inputs, separates personal
budget from inspection revenue, and includes the daily plan. The modal allows
editing before clipboard copy; a manual-selection fallback handles denial.
No keys, downloads, online calls or automatic ingestion of AI output are involved.
planningIdeas is a scratchpad excluded from the prompt and printed brief.
Tests cover day-range extension, no overwrite, DST boundaries, duplication,
legacy data, validation, prompt content, clipboard success/denial, and printing.

Inspection handoff implementation and protocol: see EXPENSE-BOOK-HANDOFF.md.
New checks: tests/handoff.cjs, handoff-ui.cjs, test_handoff.py and the synthetic inspection-transfer.json fixture.

The builder also produces an Update ZIP with allowlisted payload hashes,
folder selection, verified program backups and rollback. Data is never included.
update_guard.py coordinates startup and updating through shared-folder markers.
First migration from older builds relies on the user closing every session.
