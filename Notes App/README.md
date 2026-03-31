# Summit Notes

A simple synced notes app built as a static site with Supabase.

## Features

- no login screen
- shared notes across devices
- simple note-only entry
- bullet-style note display
- collapsible add-note panel
- mobile floating add button
- optional due dates
- high, medium, and low priority tiers
- sorting by priority, due date, or date added
- plain text summary page for external app extraction

## Main pages

- `index.html`
- `notes-app.html`
- `summary.html`

## Files

- `notes-app.html`
- `notes-app.js`
- `notes-app.css`
- `summary.html`
- `summary.js`
- `notes-auth.js`
- `notes-cloud-config.js`
- `notes-sw.js`
- `notes-manifest.webmanifest`
- `supabase-notes-schema.sql`

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase-notes-schema.sql`.
3. In `Database > Replication`, enable realtime for `notes_items`.
4. Confirm `notes-cloud-config.js` points at the correct Supabase project.

## Local preview

Open `index.html` in a static host or deploy the folder to Netlify, GitHub Pages, or another static host.

## Notes

`notes-cloud-config.js` contains the client-side publishable key used by the browser app.
