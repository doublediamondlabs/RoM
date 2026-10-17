# Expense Book ↔ RōM: itemized trip expenses

Versions: live Expense Book 3.32.47 + RōM 0.1.6.

## Update and refresh an existing trip
Back up both apps. Exit both applications on both computers and close Excel.
Apply the Expense Book update to the existing LIVE folder. Copy RōM replacement
files into its existing folder, keeping Data. Shortcuts need no reinstall.

In Expense Book, Business Workspace → Inspections & Income → Review Existing
Records → Inspections & Mileage. Plan Travel in RōM / Update RōM Trip beside the
status opens a selected visit. Expanded cards offer a button per eligible visit.
The original RōM · Inspection Travel task is still available.

Review the visit and Save Link & Export to RōM. In RōM, Plan from Expense Book
(or Refresh from Expense Book in the linked trip) → choose that JSON → review
and apply. It creates the linked trip or refreshes the existing one, including
archived trips. Save Changes. Bookings, travel dates and daily plans are kept.
Changed inspection dates/status display a review warning, never a silent move.

The refreshed file includes categories and subcategories for all linked years.
New categories require another export/refresh; they are never created silently.

## Enter receipts
Actual Costs → Add Trip Expense. Enter Date paid, Payee, Description, Amount
paid, Expense Book category and optional subcategory. Category choices follow
the expense's year. If the year has no categories, first link/create that year
in Expense Book and refresh the trip. Use positive payments with at most two
decimal places. Enter refunds directly in Expense Book.

One receipt list belongs to the whole trip, not to each alternative travel
option. Enter only amounts intended as business expenses; split mixed purchases
into separate entries as needed. No tax deductibility or percentage is computed.

The totals use itemized receipts only. Earlier manual Fuel/Lodging/Meals/Other
totals remain in Previous Lump-Sum Totals — Reference Only. They are not added,
converted or exported. Use them to cross-check receipts. Mark All trip expenses
have been entered when ready for a final comparison to the preferred estimate.
Save Changes; unfinished draft rows may remain but cannot be selected for return.

## Return and review
Expense Book Handoff or Actual Costs → Preview Return to Expense Book. Select
mileage, notes and/or complete receipts. Save Changes first. Download the JSON.
Expense Book → RōM · Inspection Travel → Import Travel from RōM → choose JSON.

Review the checked receipts, dates, categories and total. Possible matches start
unchecked. If an expense is already recorded, leave it unchecked. If it is a
separate purchase, check the confirmation AND select it. Same date/amount is a
warning, not proof of duplication; older entries without a transaction date use
month/amount. Items within the return with the same date/amount are also flagged.

Apply Trip Results adds selected entries to their dated months/years via the
existing protected multi-workbook transaction. Description = Payee · Description;
an attached app note retains the trip/inspection reference. They are recorded
business expenses; normal bank reconciliation still applies. Payments, payouts,
visit dates, vehicle and outcome are preserved. Mileage replaces the selected
visit's mileage; notes append once. Visit completion is reviewed separately.

## Repeats, corrections and conflicts
Every receipt has a permanent ID. Reimporting an applied receipt is blocked.
Editing it in RōM does not update or recreate the Expense Book entry; correct the
existing Expense Book expense. Removing it from RōM does not remove it there.
Additional new receipts can be returned later. Unselected receipts stay eligible.
If mileage/notes were already applied, return only additional expenses or refresh
the handoff first. Exporting again replaces that visit's previous generation.

If an inspection changes after export, refresh via a new export before returning.
If a linked workbook changes after preview, reload Expense Book and preview the
file again. Do not bypass this safeguard. Restoring an older backup also restores
its older import receipts/history; reconcile against the authoritative workbooks
before repeating imports after a restore.

Transfers are explicit offline JSON files containing customer information. Keep
them with business files and out of public repositories. No automatic sync,
banking connections or online requests occur. Personal trips cannot return
expenses to Expense Book. Unscheduled planning copies remain separate.
Ordinary Duplicate Trip resets receipts and removes the inspection link.
Ordinary Export/Import Trip preserves itemized data as an unlinked copy with new
receipt IDs; whole-workspace backups retain original links and receipt IDs.

## Maintainer details
Protocol version 2 adds expenseCatalog [{year,categories:[{name,subs}]} to the
inspection export, and expenses [{id,date,payee,description,amount,category,
subCategory,bucket}] to the return. Version 1 remains mileage/notes-only.
Expense Book romTransfer.js handles catalog, validation, duplicate candidates,
preview, revision guards and per-year additions; RomTransfer.jsx handles review.
main.jsx obtains fresh linked-year snapshots and applies plans through the
existing inspection/save journaled transaction. The ledger's romExpenseReceipts
persist IDs/signatures/year/record IDs across all workbooks and the shared JSON.
Per-visit romReturnState tracks the post-import snapshot for additional receipts.
Never deduplicate by customer name or automatically replace prior expenses.

RōM domain.js handles categories, receipt validation, totals and selected exports;
model.py validates persisted optional tripExpenses and expensesComplete fields.
app.js presents itemized Actual Costs and return selections. Existing manual
option actuals remain untouched. New tests: test-rom-expenses.mjs, expenses.cjs,
and extended handoff UI/schema tests. Use the normal release gates in both repos.
