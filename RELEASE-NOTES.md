# RōM v0.1.10 — public preview

Further hardens imported data display following the remaining CodeQL findings
in v0.1.9. Plain text uses explicit HTML character encoding; imported option,
checklist and daily-plan IDs are escaped in quoted attributes. Help text is
encoded as plain text. Day lookup no longer builds a selector from a record ID.
The navigation allowlist and inspection mileage escaping from v0.1.9 remain.

No trip-data schema changes. Existing trips and settings are preserved by the
updater. Close every RōM session before updating.

Downloads: RoM-v0.1.10.zip for a fresh installation;
RoM-Update-v0.1.10.zip for an existing installation.
Python 3.10 or newer is required; no Python packages are needed.

Automated verification covers repeated special characters, literal entity text,
malformed imported IDs, inspection preview and the existing release suite.
GitHub CodeQL confirmation remains pending until this source is pushed and
scanned. Passing local tests is not a claim that all security issues are absent.

MIT licensed. Experimental personal project; maintained as time permits.
