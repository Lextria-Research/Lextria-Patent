# Lextria Patent Operations Dashboard

Internal tool for tracking patent application due dates (PS-CS, Form 1,
Form 26, FER, Form 3, Hearing, Written Submission, Renewal) and lifecycle
milestones (filed, published, granted), sourced from a Google Sheet
("LR Sheet"), with a Postgres-backed layer for the fields a senior/drafter
fills in by hand (status notes, issue, checklist date, suggested action).

## Architecture

- **Frontend** — React + Vite, deployed on Netlify.
- **Backend** — Express, deployed on Render.
- **Data source** — a single Google Sheet (`DATA` tab), read via a service
  account and cached in memory for 5 minutes at a time
  (`backend/sheetCache.js`). The Sheet is the source of truth for
  applications, deadlines and drafter assignments — this app never writes
  back to it.
- **Manual-field storage** — Postgres (Supabase), one table (`due_entries`)
  for everything a person edits by hand per due occurrence.

```
Google Sheet (LR Sheet)  ──read-only──>  sheetCache (5 min TTL)
                                                │
                                     backend/dueBuilder.js
                                     (the ONE place per-type
                                      deadline/status/assignee
                                      rules live)
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        │                       │                       │
                  GET /api/dues           GET /api/overdue        GET /api/records
                (one month/year)         (every overdue due,      (raw sheet rows)
                                          all months/years)
                        │                       │
                        └───────────┬───────────┘
                                    │
                          due_entries (Postgres)
                     status / assigned_to / status_notes /
                     suggested_action / issue / checklist_sent_date
```

## Local setup

Backend:
```
cd backend
npm install
# .env needs DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, ADMIN_USERNAME/ADMIN_PASSWORD
# either backend/service-account-key.json or GOOGLE_SERVICE_ACCOUNT_JSON in .env
npm start   # node server.js — no watch/reload, restart manually after editing
```

Frontend:
```
cd frontend
npm install
npm run dev   # Vite dev server
```

`VITE_API_URL` is optional. Unset, the frontend calls the backend on port
3001 of whatever host served the page, so it works on `localhost` and from a
phone on the same Wi-Fi (`http://<PC's LAN IP>:5173`) without editing
anything. The LAN IP is DHCP-assigned and can change — Vite prints the
current one as "Network" on startup. Windows Firewall must allow Node on the
active network profile.

**Node doesn't hot-reload the backend.** After changing anything under
`backend/`, kill and restart the process (locally) or wait for Render's
auto-deploy (production) before the change takes effect.

## Pages

Main tabs, in order: LR records, Due dashboard, Patent filed, Published
patents, Granted patents, Abandoned patents, **Action list**. Action list
holds three sections behind buttons at its top — **Overdue** (the default),
**F1/F26 delayed or pending** and **F9/F18 pending** — each the original
page unchanged (`frontend/src/ActionList.jsx` just mounts them). A section
keeps its own filters while you switch sections or tabs, and the chosen
section is kept in `App.jsx` so Back from a detail page returns to it. There
is no router: every tab lives at `/`, so there are no per-tab URLs.

- **LR records** — the raw sheet, searchable, paginated. Click a code for
  full record detail (`/api/records/:code`, every sheet column).
- **Due dashboard** — one month/year at a time. Editable (status, assigned
  to, status notes, issue, checklist date, suggested action) via the pencil
  icon, frozen either side, Excel export. A **Due soon** button beside the
  page title swaps the monthly view for the dues falling today or in the
  next 7 days: two tabs (the count cards), "Due today" and "Next 7 days"
  (after today), with a Back to monthly dues button. It ignores the month
  selector and every dashboard filter, lists only not-completed dues
  (overdue ones stay on the Overdue tab), and has the same pencil edit and
  code link; a save updates both it and the monthly table. Which view is
  showing is kept in `App.jsx`, since opening a due's detail page unmounts
  the dashboard.
- **Overdue** — every currently-overdue due, across all months/years.
  View-only (no edit column) — go to Due dashboard for the due's own month
  to edit it.
- **Patent filed** — every application filed, one month/year (or "all") at
  a time. Read-only, sheet-derived (no manual fields, no edit UI). Filters
  for MAHE/Non-MAHE, Code type (the code's prefix) and Classification
  (each patent has exactly one: Provisional Specification = PS date only,
  Complete Specification = CS date only i.e. a direct CS, PS-CS = both
  dates; a PS-CS patent is listed once, in its CS month). The dropdown is
  All (the default: every patent once) / Both PS and CS (Provisional +
  Complete, PS-CS left out) / PS-CS / Provisional Specification / Complete
  Specification; the header count and MAHE cards follow it. Click a code for a curated detail
  view. Excel export splits into one worksheet per Code type instead of a
  single sheet.
- **Published patents** — every application published, same month/year and
  filter pattern as Patent filed.
- **Granted patents** — every application granted, sorted by date of grant.
- **Abandoned patents** — every application whose **Code cell is filled
  red** in the sheet (the sheet's own abandonment marker; there is no
  abandonment date or reason column, so it's an all-time list). Seven
  columns only — Code, MAHE/Non-MAHE, application no., title, Status,
  D.O.F., assigned to; the sparse and verbose fields (inventors, applicant,
  publication, Form 9/18) are export- and detail-only.
  Filters: search, MAHE/Non-MAHE, Code type and Status. Excel export splits
  into a MAHE and a Non-MAHE worksheet (plus Unclassified only if any
  exist). Abandoned rows are also tinted with an "Abandoned" badge on Patent
  filed and Published patents; Due dashboard, Overdue and Granted are
  unaffected.

- **F9/F18 pending** — CS-filed applications whose Form 9 and/or Form 18
  is still not filed, in three buckets (both pending / F9 only / F18 only)
  with filter cards and a code-click detail view. F9 only counts as
  pending while the application is unpublished. Each row shows its
  Form-18 (RFE) deadline — 48 months from the priority date, or 31 months
  if that date is on or after 15 Mar 2024 — shaded red once lapsed.
  Abandoned (red Code cell) rows are left out. Rows whose STATUS shows
  further progress despite a pending form, duplicate application numbers,
  unclear cell text and blank-Code rows are still computed by the backend
  but not displayed (that section is commented out in `F9F18Check.jsx`).
  Excel export has one sheet per bucket and per integrity list. Rules
  live in `backend/f9f18Check.js`.
- **F1/F26 delayed or pending** — every application where Form 1 or
  Form 26 was filed late ("Delayed") or is still unfiled with its deadline
  passed ("Pending"), with a verdict on whether postdating can still fix
  it. Read-only and sheet-derived. The two forms are checked separately;
  **Days needed** is the larger of the two days-late figures (Form 26's
  deadline is the earlier one and can need more), compared with **Days
  available** from "Remaining Post-Date Months": the `(N days)` in the text,
  or 181 for "Not yet Postdated" / "PS Not yet filed". Any other text gives
  "Unknown" — no guess, and the tab lists those codes in a banner. Abandoned
  (red Code cell) and `Patent Granted` rows are excluded. "Pending" uses
  the same server-clock "today" as Overdue. Cards filter All / Can be fixed
  / Cannot; sorted fixable-first, then fewest days needed. Rules live in
  `backend/f1f26Delayed.js`.

All three due tables live in `frontend/src/DueTable.jsx` (shared building
blocks — `EditRow`, `StatusBadge`, `FormStatusCell`, `SummaryCard` — plus
Overdue's own table) and `frontend/src/DueDashboardTable.jsx` (Due
dashboard's richer table). They're deliberately **not** a single shared
component — Due dashboard and Overdue show different columns on purpose.
Patent filed, Published patents and Granted patents are each their own
component (`PatentFiled.jsx`, `PublishedPatents.jsx`,
`GrantedPatents.jsx`) built directly off the sheet, with no `due_entries`
involvement at all.

## Business rules that aren't obvious from the code alone

- **Due-type-specific deadline/completion columns** are all defined in
  `backend/dueLogic.js` (`DUE_TYPES`, plus the Renewal/Hearing column
  constants). This is the only place that mapping should ever live.
- **Fixed assignees** — Hearing, Renewal and Written Submission always go
  to the same person (`FIXED_ASSIGNEES` in `backend/dueBuilder.js`),
  regardless of anything saved in `due_entries`. Only FER and Form 3 are
  assigned by hand; PS-CS/Form 1/Form 26 come from the sheet's own
  "Assigned to" column.
- **Hearing status is not automatic.** Once a hearing date passes with no
  Written Submission filed, the due does *not* auto-flip to "overdue" — it
  stays "pending" until a senior manually marks it (`canSetStatus` on the
  due object gates this in the UI).
- **"Can be postdated upto" is PS-CS-only.** It's sourced from the sheet's
  "Remaining Post-Date Months" column, which the sheet itself only ever
  populates for PS-CS rows — a blank/dash for every other due type is
  correct, not missing data. A formula error there (e.g. `#NUM!`) is
  treated the same as blank rather than shown literally.
- **How far an abandoned application got comes from the sheet's STATUS
  column**, never derived from its filing dates. STATUS ("PS Filed - CS Not
  Filed", "Direct CS Filed - F9 & F18 Not Filed", ...) names the missing
  form, agrees with the dates on every row, and where it's blank the dates
  are too unreliable to infer from — one such row has an application number
  but no filing date, so a date-derived stage would read "not filed" and be
  wrong. A blank STATUS stays blank. For the same reason the tab carries
  neither Classification nor separate PS/CS filing dates: an abandoned
  application has a PS date or a CS date and virtually never both (1 of 187
  rows), so D.O.F. is that single date and STATUS names which kind it was.
- **Renewal has two occurrences per row**, not one deadline+completion pair
  like other types — "Date of Next Renewal" (pending) and "Date of
  Renewal" (done) are read as separate due entries.

## `due_entries` schema

One row per (code, type_of_due, due_date) — i.e. per due *occurrence*, not
per application. `ON CONFLICT (code, type_of_due, due_date) DO UPDATE` on
every save.

| column | type | notes |
|---|---|---|
| `id` | integer | |
| `code` | text | matches the sheet's Code column |
| `type_of_due` | text | one of the 8 due types |
| `due_date` | date | the specific occurrence's deadline |
| `status` | text | only meaningful for Hearing (`completed`/`overdue`) — every other type's status is always computed live, never read from here |
| `assigned_to` | text | only meaningful for FER/Form 3 — every other type's assignee is fixed or sheet-driven, never read from here |
| `status_notes` | text | free text |
| `suggested_action` | text | free text |
| `issue` | text | free text |
| `checklist_sent_date` | date | |
| `created_at` / `updated_at` | timestamp | |

## Bulk-editing historical months

`backend/scripts/` has one-off importer scripts (`importStatusNotes.js`,
`importIssue.js`, etc.) used to backfill a pasted month's worth of a single
field. Pattern: dry run by default, `--apply` to write. They resolve each
row's *live* deadline from the sheet rather than trusting a pasted date, so
entries land on the exact `due_date` the app will look up later even if the
sheet has drifted since the list was compiled — and they always preserve
every other column on an existing row. Not wired into the UI; run manually
when a new month's backlog needs importing.

## API

All routes except `/api/login` and `/api/health` require an `x-auth-token`
header (`POST /api/login` with `ADMIN_USERNAME`/`ADMIN_PASSWORD` from
`.env` — a single shared login, no per-user accounts, in-memory token store
that resets on every backend restart).

| route | purpose |
|---|---|
| `POST /api/login` | get a token |
| `POST /api/refresh` | force an immediate sheet re-read (bypasses the 5-min cache) |
| `GET /api/records` | every sheet row, keyed by header name |
| `GET /api/records/:code` | one row, every column |
| `GET /api/dues?month=&year=` | one month's dues, all types |
| `GET /api/overdue` | every currently-overdue due, all months/years |
| `GET /api/due-soon` | not-completed dues with a deadline today or in the next 7 days (not month-scoped, no filters) plus the server's `today` |
| `GET /api/due-detail?code=` | extra sheet fields for the due-detail page (applicant, inventor, department, phone, post-date months) |
| `GET/POST /api/due-entries` | read/write one due's manual fields |
| `GET /api/patent-filed?month=&year=` | every application filed, one month/year (`year=all` for all-time, `month=all` for every month in a year) |
| `GET /api/published-patents?month=&year=` | every application published, same month/year semantics |
| `GET /api/granted-patents` | every application granted, all-time |
| `GET /api/f9-f18-check` | the F9/F18 pending buckets plus the integrity lists (duplicates, contradictions, unclear, blank-Code rows) |
| `GET /api/f1-f26-delayed` | every application with a delayed or pending Form 1/Form 26 plus its postdating verdict, all-time; `flagsUnavailable: true` if the cell colors couldn't be read |
| `GET /api/abandoned-patents` | every application with a red Code cell, all-time; `flagsUnavailable: true` if the cell colors couldn't be read |

## Known gaps / not done

- **No mobile support.** The Due dashboard and Overdue tables are wide by
  design (frozen columns, 2000px+ min-width) — unusable below a normal
  laptop screen width. Not addressed yet.
- **No tests, no CI.** Every change is verified manually.
- **Single shared login**, no roles, no audit trail on `due_entries`
  changes (last write wins, no history of who changed what).
- **No proactive alerting** — nothing notifies anyone as a deadline
  approaches or the moment something goes overdue; the dashboard has to be
  opened to find out.
