# Pill Reminder — Project Context

## What this is

A personal daily medication tracker built as a single-file PWA (`index.html`), hosted on GitHub Pages. Installed via "Add to Home Screen" on iPhone. No build step, no CLI, no tooling — just a file.

**Live URL:** <https://cff.github.io/pill-reminder/>

## Stack

- React 18 (CDN/UMD) + Babel standalone for in-browser JSX
- **Supabase** for cloud persistence (migrated from IndexedDB in pr-v56)
- CSS custom properties, auto dark/light via `prefers-color-scheme`
- Service worker for offline support and home screen PWA caching
- Single `index.html` — everything lives here

## CRITICAL: Storage is Supabase, NOT IndexedDB

**The app was originally built with IndexedDB, but migrated to Supabase cloud storage in pr-v56. Do not revert to IndexedDB under any circumstances.**

The current storage layer uses `sbGet` / `sbSet` (not `dbGet` / `dbSet`).

- Supabase project: `https://fotzkqkghxndjnomrspr.supabase.co`
- Anon key embedded directly in `index.html`
- Access via `?u=yourname` URL param, stored in localStorage on first visit
- KV table schema: `(user_token, key, value jsonb)`
- SW fetch handler bypasses cache for `supabase.co` requests (always network)
- If no token: "Access required" screen

**Never use `dbGet`/`dbSet`/`openDB`/`IndexedDB` in this codebase.**

## CRITICAL: Workflow for patching

**Always fetch fresh from GitHub API before patching. Never patch a stale in-session copy.**

```
GET https://api.github.com/repos/cff/pill-reminder/contents/index.html
Authorization: token [TOKEN — see Claude memory]
Accept: application/vnd.github.v3.raw
```

Get SHA from metadata, apply patches in Python, push back via PUT with SHA.

## Current version

`pr-v61` — bump the SW cache string and Settings version string on every commit.

## Workflow

Claire works entirely on iPhone. Changes discussed with Claude, then Claude downloads `index.html` via GitHub API, applies patches, pushes back directly.

**Commit style:** short imperative title + 2–4 line plain-text description.

**SW versioning rule:** bump `pr-vNN` on every meaningful commit — both the SW cache constant (bottom of file) and the version string shown in Settings.

**JSX validation rule (mandatory before every commit):** After every patch, run a Babel parse check before committing. A missing `</div>` or malformed JSX causes a blank page with no useful error. Run this in bash_tool before every commit:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('index.html', 'utf8');
const match = src.match(/<script type=\\\"text\\/babel\\\">([\\s\\S]*?)<\\/script>/);
require('@babel/parser').parse(match[1], { plugins: ['jsx'] });
console.log('JSX OK');
"
```

If the parse fails, fix before showing preview. Never commit unvalidated JSX.

## Architecture

- Single `App` component holds all state
- `TabBar`, `HistoryView`, `SettingsView` are top-level named components (props-based), defined *before* `App`
- `TabBar` renders outside the scrollable container so `position:fixed` works
- Dropdowns use `ReactDOM.createPortal` into `document.body`

## Data model

| Key | Value |
|-----|-------|
| `pr:list` | `{ morning: [...], lunch: [...], evening: [...], as_needed: [...] }` |
| `pr:day:YYYY-MM-DD` | `{ morning: {id: bool}, lunch: {id: bool}, evening: {id: bool}, as_needed: {id: [timestamps]} }` |
| `pr:asneeded:YYYY-MM-DD` | `{ id: [timestamp_ms, ...] }` |
| `pr:archived` | array of archived pill objects with `endDate` |
| `pr:profile` | `{ name, age, weight, height }` |

## Features built

**Sessions:** morning / lunch / evening. Night auto-migrates to evening. Expired pills auto-archived.

**Pill model:** `shape`, `schedules: [{session, timing}]`, `startDate`, `durationDays`, `asNeeded`, `maxDailyDose`, `minIntervalHours`

**PillForm:** shape carousel (8 SVGs), timing + session selectors, duration toggle, as-needed toggle with steppers, OpenFDA autocomplete.

**As-needed:** timestamped doses, 3 button states (available/interval-blocked/max-reached), "Next at HH:MM" chip. Detail sheet shows today's doses — edit time inline, delete, add missed dose.

**Pill cards:** 92px height, 10px vertical padding, 44px checkbox tap target, dose 14px, timing 13px.

**History:** past-day toggleable logs, shows pills active on that date, "Show all" loads full Supabase history.

**Drug tips:** dynamic DRUG_TIPS lookup for active medications.

**Settings:** profile, export/import JSON, account token display, about/version.

**Navigation:** bottom tab bar Today/History/Settings, safe area insets everywhere.

## Design

- Fonts: DM Serif Display (titles) + DM Sans (body)
- App name: **Posology** (rebranded pr-v57)
- Orange = in-progress, green = fully complete
- `--t2` for secondary text (not `--t3` — too low contrast)
- Stepper buttons: `--acc-soft` bg + `--acc` color
- Pill cards: border-radius 18px, group cards 16px

## Known gotchas

- **Supabase not IndexedDB.** `sbGet`/`sbSet` only.
- **Always fetch fresh from GitHub before patching.**
- **Babel hooks rules:** no hooks after conditional returns, no components defined inside `App`.
- **SVG paths:** use absolute coordinates only — relative commands fail silently in Babel standalone.
- **`overflow:hidden` clips dropdowns:** use `ReactDOM.createPortal`.
- **SW cache bypass:** Supabase requests must not be cached by the SW.
- **PWA home screen cache is isolated from Safari.** SW version bump forces update on iOS.
