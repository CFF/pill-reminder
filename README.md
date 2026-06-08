# Posology

A personal daily medication tracker PWA hosted at <https://cff.github.io/pill-reminder/>

## What it is

Single-file PWA for tracking morning/lunch/evening medications plus as-needed drugs, with history, drug tips, and cloud sync. Each user accesses the app via a personal token URL and installs it on their iPhone home screen.

## Install on iPhone (iOS)

1. Open your personal link in **Safari** — e.g. `https://cff.github.io/pill-reminder/?u=yourname`
2. Tap the **Share** button (box with arrow pointing up) at the bottom of the screen
3. Scroll down and tap **Add to Home Screen**
4. Rename if you want, then tap **Add**

The app icon will appear on your home screen. Future launches from the icon work without the `?u=` parameter — it's saved automatically on first visit.

> ⚠️ Must be opened in **Safari**, not Chrome or another browser, for Add to Home Screen to work correctly on iOS.

## Access

The app uses token-based access via URL parameter:

```
https://cff.github.io/pill-reminder/?u=yourname
```

Choose any token name — no configuration needed. Share a different link with each person (e.g. `?u=lysiane`). Each token has its own isolated data in Supabase.

## Tech

- Single `index.html`, no build step
- React 18 (UMD/Babel) loaded from CDN
- **Supabase** cloud storage (migrated from IndexedDB in pr-v56)
- CSS variables with automatic light/dark mode
- Service worker for offline/PWA support

## Data model

| Key | Value |
|-----|-------|
| `pr:list` | Pill definitions per session |
| `pr:day:YYYY-MM-DD` | Daily taken/missed log |
| `pr:asneeded:YYYY-MM-DD` | As-needed dose timestamps |
| `pr:archived` | Expired pills with end dates |
| `pr:profile` | User profile (name, age, weight, height) |

## Deploying

Claude fetches `index.html` via GitHub API, patches it, and pushes back directly. Bump the SW cache version (`pr-v61` → `pr-v62` etc.) on each deploy to force PWA home screen refresh on iOS.

## Storage history

Originally used IndexedDB (local, origin-scoped, lost on reinstall). Migrated to Supabase in pr-v56 for data resilience across reinstalls and multi-user support.
