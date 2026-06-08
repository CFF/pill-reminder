# Posology

A personal daily medication tracker PWA hosted at <https://cff.github.io/pill-reminder/>

## What it is

Single-file PWA for tracking morning/lunch/evening medications plus as-needed drugs, with history, drug tips, and cloud sync. Install via Add to Home Screen on iOS.

## Tech

- Single `index.html`, no build step
- React 18 (UMD/Babel) loaded from CDN
- **Supabase** cloud storage (migrated from IndexedDB in pr-v56)
- CSS variables with automatic light/dark mode
- Service worker for offline/PWA support

## Access

The app uses token-based access via URL parameter:

```
https://cff.github.io/pill-reminder/?u=yourname
```

The token is saved to localStorage on first visit — subsequent home screen launches work without the `?u=` param.

## Data model

| Key | Value |
|-----|-------|
| `pr:list` | Pill definitions per session |
| `pr:day:YYYY-MM-DD` | Daily taken/missed log |
| `pr:asneeded:YYYY-MM-DD` | As-needed timestamps |
| `pr:archived` | Expired pills with end dates |
| `pr:profile` | User profile (name, age, weight, height) |

## Deploying

Claude fetches `index.html` via GitHub API, patches it, and pushes back directly. Bump the SW cache version (`pr-v61` → `pr-v62` etc.) on each deploy to force PWA home screen refresh on iOS.

## Storage history

Originally used IndexedDB (local, origin-scoped). Migrated to Supabase in pr-v56 for data resilience across reinstalls and multi-user support.
