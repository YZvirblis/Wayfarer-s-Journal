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
- [ ] `[[Entry Title]]` links with autocomplete in the editor
- [ ] Backlinks panel ("Mentioned in…") on every entry
- [ ] Ctrl+K command palette: search everything, jump anywhere, create entries
- [ ] Quick-capture popup (global in-app hotkey) → inbox of unsorted captures
- [ ] Convert a capture into an entry
- [ ] Session log: dated timeline of play sessions, linked to entries
- [ ] Keyboard navigation of the entry list (↑/↓ to move, Enter to open)
- [ ] Search across every section, not just the open one

## Phase 3 — Depth
- [ ] Septim ledger: income/expenses linked to people and tags
- [ ] Goals: savings/debt targets with deadlines and progress bars
- [ ] Relationship web: interactive graph of people, factions, places
- [ ] Custom field editor for entry types
- [ ] "Hide secrets" blur mode for screenshots/streaming
- [ ] Portrait upload for characters and people
- [ ] Reorder profile fields and sections by drag (the grip handle is decorative today)
- [ ] Reorder sections in the sidebar

## Phase 4 — Release
- [ ] Visual polish pass (spacing, motion, responsiveness, accessibility)
- [ ] Responsive layout below ~1000px — the sidebar + list + detail panes assume a wide window
- [ ] Code-split the client bundle (currently one ~540 kB chunk) and trim bundled font subsets to latin/latin-ext
- [ ] Export: JSON (full backup) and Markdown (readable)
- [ ] Import: JSON; optional plain-text journal import
- [ ] Restore from backup in the UI
- [ ] Electron packaging → portable Windows .exe
- [ ] GitHub Actions: build and attach .exe to Releases
- [ ] README: hero screenshot, GIF demo, features, download, FAQ
- [ ] CONTRIBUTING.md, issue templates
- [ ] v1.0.0 release

## Phase 5 — Launch
- [ ] Screenshots/GIF using the example character (no real secrets)
- [ ] Keizaal Discord announcement post
