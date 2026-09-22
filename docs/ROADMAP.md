# Roadmap

Tick items as they are completed (`- [x]`). Add newly discovered tasks under the right phase.

## Phase 1 — Foundation ✅ complete
- [x] Project scaffold: Vite + React + TS + Tailwind, Node server, shared zod schemas
- [x] npm scripts: `dev`, `build`, `start` (plus `typecheck`)
- [x] Storage module: atomic writes, rolling backups (20), schemaVersion + migration hook
- [x] REST API per DESIGN §3
- [x] Client state + debounced autosave + save-status indicator
- [x] Character select screen (create, duplicate, delete, load example)
- [x] App shell: sidebar, character switcher, entry-type navigation with counts
- [x] Entries: list + detail, search, tag filter, sort, pin, secret flag
- [x] Built-in types: People, Places, Factions, Quests (status + progress), Notes
- [x] Custom sections (create entry type: name, icon, color)
- [x] Tags: inline create, colors, groups, tag manager
- [x] Overview/profile page: editable fields and sections
- [x] Markdown body with edit/preview
- [x] Dark + Parchment themes via design tokens, theme toggle
- [x] Empty states
- [x] Fictional example character in `examples/`
- [x] `start.bat`, `stop.bat`, `start.sh`
- [x] .gitignore, MIT LICENSE, basic README

## Phase 2 — Connections & Capture
- [x] `[[Entry Title]]` links with autocomplete in the editor (incl. `[[Title|Type]]` disambiguation, rename-rewrite, create-from-unresolved-link)
- [x] Backlinks panel ("Mentioned in…") on every entry, with a context snippet per source
- [x] Ctrl+K command palette: fuzzy search over entries, sections, profile sections and tags; jump anywhere; create entries of any type; switch characters; toggle theme
- [x] Quick-capture popup (`Ctrl+/` in-app hotkey, `[[links]]` work inside) → Inbox with a count in the sidebar
- [x] Convert a capture into an entry of any type, append it to an existing entry, or dismiss it
- [x] Session log: dated timeline of play sessions; entries linked from a session's body list it under "Mentioned in"
- [x] Narrow-window layout (~600–1000px): icon-rail sidebar below 1200px, single-pane list/detail with a back action below 960px
- [x] Keyboard navigation of the entry and session lists (↑/↓/Home/End to move, Enter or double-click to open with focus in the detail title; ↓ from the search box walks into the list)
- [x] ~~Search across every section, not just the open one~~ — superseded by the Ctrl+K palette; the list box shows "N more in other sections — search everywhere", which opens the palette with the query
- [x] Example character ships with a sample capture and a sample session (file is schemaVersion 2)

## Phase 3 — Depth
- [x] Septim ledger (schema v3): running balance, month groups, filters by person / tag / goal, totals in view, one-line quick entry with `@person` autocomplete, inline editing, "Dealings" on every person
- [x] Goals (schema v3): save / debt kinds, progress derived from the ledger, remaining / percent / days left / per-week figure, cards on the Overview and a Goals page with a quick payment line
- [x] Relationship web: d3-force graph of People, Factions and Places around the character; ties from `[[links]]`, shared locations and ledger dealings; colour by section, size by ties, standing on People edges; hover, click-to-open, drag, zoom, tag filter
- [x] Custom field editor for entry types: add, remove (data-aware confirmation with the affected count), rename, reorder, kinds text / choice / number, choice options; built-ins editable except People's locked standing field
- [x] "Hide secrets" blur mode for screenshots/streaming: toggle in both sidebars and the palette, banner while on, click-to-reveal veils on entries, list rows, profile sections, goals and ledger lines; secrets left out of the web, backlinks, palette, entry picker and dealings; persisted in settings.json
- [x] Portraits for the character and People (schema v4): paste, drop or pick a file; centre-cropped and scaled to 256px client-side; shown on character cards, the switcher, the Overview, People rows, the detail pane, the palette and web nodes
- [x] Reorder profile fields and sections by dragging the grip (pointer events, so touch works) or with ↑/↓ on the grip
- [x] Reorder sections in the sidebar (done in Phase 4a)

## Phase 4a — Harden and polish
- [x] Narrow-width pass at 700px and 960px across ledger, goals, web, field editor, sessions and inbox — usable beside a game window
- [x] Sessions gain a `secret` flag (schema v5); captures stay unblurred, balances stay visible
- [x] Reorder sections in the sidebar (drag the grip in the full sidebar; Move up / down in every section menu, which also serves the icon rail)
- [x] Code-split the web view (d3) and other heavy routes; drop unused font subsets; entry chunk 193 kB (51 kB gzipped), vendors in separate cacheable chunks, fonts 507 → 332 kB
- [x] Export JSON (full document) and Markdown (readable; secrets omitted while hide-secrets is on, with a confirmation saying which), from the character menu and the palette
- [x] Import JSON as a new character: validate, migrate, preview what was found, never overwrite (character menu, palette, and the character-select screen)
- [x] Restore from backup in the UI: list with timestamps and counts, restore as new or replace current (two-step, current backed up first)
- [x] Polish pass: dialogs focus their first field, softer web edges on Parchment, both themes checked on web, ledger, goals, sessions, inbox and palette
- [ ] Dark-theme screenshots of the example at 1440px in `docs/screenshots/`: web (hero), entry detail with backlinks, ledger with goals, palette open, character select

## Phase 4b — Release
- [ ] Electron packaging → portable Windows .exe with `data/` next to the exe
- [ ] OS-level global quick-capture hotkey via Electron `globalShortcut`, opening a small always-on-top capture window — the browser cannot see keys while the game window is focused
- [ ] GitHub Actions: build and attach the .exe to Releases
- [ ] README: hero screenshot, GIF demo, features, download, FAQ
- [ ] CONTRIBUTING.md, issue templates
- [ ] v1.0.0 release
- [ ] Optional plain-text journal import

## Phase 5 — Launch
- [ ] Screenshots/GIF using the example character (no real secrets)
- [ ] Keizaal Discord announcement post
