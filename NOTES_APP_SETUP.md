# Summit Notes setup

This app is a separate static notes app in this folder, built for:

- no login screen
- one shared notebook that opens directly on any device
- simple note-only entry with no title field
- bullet-style notes
- a compact collapsible add-note panel
- optional due dates
- high, medium, and low priority tiers
- sorting by priority, due date, or date added
- installable PWA support for phone home screens

## Important privacy note

This version has no login and no PIN.
Anyone who knows the app URL can read and change the notes.
If you want stronger privacy later, add a PIN or restore accounts.

## Files

- `index.html`
- `notes-app.html`
- `notes-app.css`
- `notes-app.js`
- `notes-auth.js`
- `notes-cloud-config.js`
- `notes-sw.js`
- `notes-manifest.webmanifest`
- `notes-icon.svg`
- `supabase-notes-schema.sql`

## Supabase setup

1. In Supabase **SQL Editor**, run `supabase-notes-schema.sql`.
2. In **Database > Replication**, enable realtime for `notes_items`.
3. Keep the project URL and anon key in `notes-cloud-config.js`.

If the app says it cannot find `public.notes_items`, the SQL file has not been run yet in Supabase.

## Hosting

This app is plain static HTML, CSS, and JavaScript, so you can host it on:

- Netlify
- Vercel
- Cloudflare Pages
- GitHub Pages

Open the site root or `notes-app.html` after deployment.
