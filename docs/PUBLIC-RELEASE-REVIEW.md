# RōM public-release candidate review — 2026-10-17

Status: **prepared for owner review, not cleared for public launch**.
Scope: a separate source snapshot based on working RōM 0.1.7, with a 0.1.8
candidate version, public documentation and synthetic example. Existing live apps
and GitHub repositories have not been changed.

## Completed source review

- Explicit app/source allowlists; no Data folder, saved trips, backups, .git,
  credentials, node_modules, or Python runtime are intended for release packages.
- Text scan for token/private-key patterns, personal home paths, private-network
  addresses and known private-project identifiers returned no findings in the
  staged source. Matching is heuristic, not a guarantee that all private data or
  secrets have been found. Source/tests were also inspected for data/network use.
- Existing JSON test fixtures use synthetic data. The new example is fictional,
  validates against the current schema and uses the additive Import Trip path.
- Runtime uses local files and Python standard library; no API keys, downloaded
  fonts, telemetry, CDN dependencies or online route service are required.
- Developer dependency metadata/notices are recorded in THIRD-PARTY-NOTICES.md.
  The lockfile retains the installed test tree's resolved URLs and integrity data.

## Release checklist — completed and outstanding

1. **Git history — resolved by owner confirmation:** on 2026-10-17 the owner
   confirmed https://github.com/doublediamondlabs/RoM was newly created and never
   populated. No earlier project commits need review if that remains the case.
   This is owner-provided information, not an independently inspected repository.
   Review the files and author email in the first commit before pushing.
2. **License — approved:** on 2026-10-17 the owner approved MIT licensing, including
   commercial reuse. LICENSE now contains the adopted terms with the project
   attribution, Copyright (c) 2026 Double Diamond Labs. Dependencies keep their own
   licenses. Confirm rights before adding third-party artwork or contributions.
3. **Screenshots — completed:** owner supplied Compare Options and Daily Plan
   screenshots on 2026-10-17. Both show the fictional example with no visible
   personal/customer details. Included unchanged in README. Launch, demo import
   and navigation are visually evidenced; saving/printing and other pilot checks remain.
4. **Developer setup:** clean online npm ci verification remains pending because
   registry access was unavailable. Tests use the local installed locked versions.
5. **Windows pilot:** verify app launch, shortcut/icon, demo import, departure print,
   backup/restore, and updater using a disposable copy. Automated DOM tests do not
   establish native rendering, printing, or all network-share behaviors.
6. **Private security contact:** configure GitHub private vulnerability reporting
   or a deliberate private contact before inviting public security reports.

No vulnerability-free or legally cleared claim is made. No public repository,
release or visibility change has been performed. MIT adoption applies to this
local candidate; no GitHub files have been changed.

## Automated verification completed

All 14 Python tests and the domain, DOM, handoff and expense suites passed.
The example imports through the actual domain code and validates against the
server schema. Actual ZIP contents were checked for excluded runtime folders;
the packaged updater upgraded a disposable 0.1.7 installation and preserved its
synthetic saved-data bytes. Native Windows/print and fresh npm ci remain pending.
