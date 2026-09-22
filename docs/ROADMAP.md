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
- [ ] Code-split the client bundle (currently one ~540 kB chunk) and trim bundled font subsets to latin/latin-ext
- [ ] Export: JSON (full backup) and Markdown (readable)
- [ ] Import: JSON; optional plain-text journal import
- [ ] Restore from backup in the UI
- [ ] Electron packaging → portable Windows .exe
- [ ] True global (OS-level) quick-capture hotkey via Electron — the browser cannot see keys while the game window is focused, so the Phase 2 in-app shortcut only works when the journal has focus
- [ ] GitHub Actions: build and attach .exe to Releases
- [ ] README: hero screenshot, GIF demo, features, download, FAQ
- [ ] CONTRIBUTING.md, issue templates
- [ ] v1.0.0 release

## Phase 5 — Launch
- [ ] Screenshots/GIF using the example character (no real secrets)
- [ ] Keizaal Discord announcement post
