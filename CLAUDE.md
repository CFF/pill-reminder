# Posology — Project Context

## What this is

A personal daily medication tracker built as a single-file PWA (`index.html`), hosted on GitHub Pages. Installed via "Add to Home Screen" on iPhone. No build step, no CLI, no tooling — just a file.

**Live URL:** <https://cff.github.io/pill-reminder/>

## Stack

- React 18 (CDN/UMD) + Babel standalone for in-browser JSX
- **Supabase** for cloud persistence (migrated from IndexedDB in pr-v56)
- CSS custom properties, auto dark/light via `prefers-color-scheme`
- Service worker for offline support and home screen PWA caching
- Single `index.html` — everything lives here
- **Supabase Edge Function** `get-tips` for AI-powered recommendations (Claude API key stored as Supabase secret, never in code)

## CRITICAL: Always fetch fresh from GitHub before patching

**Never reuse a previously fetched `/tmp/index.html` from earlier in the session.**

1. Fetch the latest commit SHA first
2. Download fresh `index.html` via raw API
3. Verify version with `grep -o "pr-v[0-9]*" /tmp/index.html`
4. Apply patches in Python on the fetched file
5. Fetch fresh SHA again immediately before PUT (never reuse)
6. Commit via PUT with fresh SHA

```bash
# Fetch latest commit SHA
curl -s -H "Authorization: token TOKEN" \
  "https://api.github.com/repos/cff/pill-reminder/commits?per_page=1"

# Fetch raw file
curl -s -H "Authorization: token TOKEN" \
  -H "Accept: application/vnd.github.v3.raw" \
  "https://api.github.com/repos/cff/pill-reminder/contents/index.html?ref=COMMIT_SHA" > /tmp/index.html
```

A past incident (pr-v57 area) occurred when Claude committed from a stale in-session copy, overwriting Supabase storage and losing multiple commits. A second incident (pr-v81) caused a blank page when patches were applied to the wrong file. Both are prevented by always fetching fresh.

## CRITICAL: Storage is Supabase, NOT IndexedDB

The app uses `sbGet` / `sbSet` (not `dbGet` / `dbSet`). Never use IndexedDB.

- Supabase project: `https://fotzkqkghxndjnomrspr.supabase.co`
- Anon key embedded in `index.html`
- Access via `?u=username` URL param — users can also enter token on the access screen
- KV table schema: `(user_token, key, value jsonb)`

## Current version

`pr-v81` — bump SW cache string and Settings version string on every commit (both occurrences, global replace).

## Workflow

Claire works on iPhone (and occasionally Mac). Changes discussed with Claude, then Claude fetches `index.html` via GitHub API, applies patches in Python, pushes back directly via Contents API.

**Commit style:** short imperative title + 2–4 line plain-text description.

**SW versioning rule:** bump `pr-vNN` on every meaningful commit — SW cache constant (bottom of file) AND version string in Settings. Use `sed -i 's/pr-vXX/pr-vYY/g'` or Python replace, verify count == 2.

**Preview rule:** always show a diff or rendered preview and wait for explicit approval before committing.

## Architecture

- Single `App` component holds all state
- All named sub-components (`TabBar`, `HistoryView`, `SettingsView`, etc.) defined *before* `App` — required by Babel standalone hooks enforcement
- `TabBar` renders outside the scrollable container (sibling, not child) so `position:fixed` works
- Dropdowns use `ReactDOM.createPortal` into `document.body` to escape `overflow:hidden`
- Today scroll container has class `today-scroll`

## Data model

| Key | Value |
|-----|-------|
| `pr:list` | `{ morning: [...], lunch: [...], evening: [...], as_needed: [...] }` |
| `pr:day:YYYY-MM-DD` | `{ morning: {id: bool}, lunch: {id: bool}, evening: {id: bool} }` |
| `pr:asneeded:YYYY-MM-DD` | `{ id: [timestamp_ms, ...] }` |
| `pr:archived` | `{ morning: [...], lunch: [...], evening: [...] }` with `endDate` |
| `pr:profile` | `{ name, age, weight, height }` |
| `pr:tips:HASH` | Cached AI tips array for a given pill list hash |

**localStorage keys (device-only, not Supabase):**
- `pr:seenTipLabels` — array of tip labels the user has scrolled past (used to suppress "New" badge on reload)

## Features

**Sessions:** morning / lunch / evening. Night auto-migrates to evening on load. Expired pills auto-archived via `archiveExpired()` which now returns `{list, changed}`.

**Pill model:** `shape`, `schedules: [{session, timing}]`, `startDate`, `durationDays`, `asNeeded`, `maxDailyDose`, `minIntervalHours`, `dosageAmt`, `dosageUnit`

**PillForm:** shape carousel, timing + session selectors, duration toggle, as-needed toggle, OpenFDA autocomplete from 2 chars.

**As-needed:** timestamped doses, 3 button states (available / interval-blocked / max-reached). Detail sheet: edit time inline, delete dose, add missed dose.

**AI Recommendations (pr-v67+):**
- Calls `${SUPA_URL}/functions/v1/get-tips` (Supabase Edge Function)
- Triggered on: pill add, pill delete, app load
- Cached in Supabase by hash of pill list description
- `tipsLoading=true` set before `setAddSheet(null)` so banner shows immediately on Save
- "New" chip (blue) + blue dot on unseen tip cards
- Cards marked seen via IntersectionObserver (threshold 0.9); persisted in localStorage
- Banner: grey + spinner while loading, orange + arrow when ready, scrolls to first unseen card
- `hasNewTips` drives both the banner and the dot on the Today tab icon
- `archiveExpired` clears `aiTips` if pills changed, forcing regeneration

**History:** past-day toggleable logs, shows pills active on that date using archived data, "Show all" loads full Supabase history.

**Settings:** profile fields, export/import JSON backup, version display.

**Navigation:** bottom tab bar Today/History/Settings, safe area insets on all scroll containers (`paddingBottom: calc(90px + env(safe-area-inset-bottom,0px))`).

**Token entry:** users without `?u=` in URL see an input field to enter their token directly.

## Design

- Fonts: DM Serif Display (titles, `.serif`) + system font body
- App name: **Posology**
- Orange accent `#c87941` / `var(--acc)` = in-progress
- Green `var(--green)` = fully complete
- Blue `var(--blue)` = new / informational
- `--t2` for secondary text (not `--t3` — too low contrast)
- Pill cards: border-radius 18px; group cards 16px
- Design tokens: `var(--acc)`, `var(--acc-soft)`, `var(--t1)`, `var(--t2)`, `var(--t3)`, `var(--sep)`, `var(--sep-strong)`, `var(--card)`, `var(--bg)`, `var(--blue)`, `var(--green)`, `var(--red)`, `var(--violet)`

## Known gotchas

- **Always fetch fresh from GitHub before patching.** Never reuse a stale in-session copy.
- **Supabase not IndexedDB.** `sbGet`/`sbSet` only.
- **Babel hooks rules:** no hooks after conditional returns, no components defined inside `App`.
- **`overflow:hidden` clips dropdowns:** use `ReactDOM.createPortal`.
- **SW cache is isolated from Safari on iOS.** SW version bump is mandatory on every meaningful commit.
- **GitHub Secret Scanning blocks API keys in code.** Anthropic key lives in Supabase secrets only — accessed via Edge Function, never in `index.html`.
- **Large file:** ~106KB. Use Python `sys.stdin.read()` or direct GitHub API download — bash heredocs fail silently at this size.
- **Version string appears in exactly 2 places:** SW cache constant and Settings label. Always verify count == 2 after replace.
