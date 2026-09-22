# Progress

Read this file first at the start of every session. Update it at the end of every session.

## Current Status
**Phase:** 4a — Harden and polish, **complete**. Phases 1–3 are complete. Next is Phase 4b — Release (Electron, CI, README, v1.0.0).

The app is on GitHub (`origin/main`, pushed at the start of Session 4 on the user's instruction). Everything since is committed locally and **not pushed**; the user pushes.

What Phase 4a added: a narrow-width pass so ledger, goals, web, field editor, sessions and inbox all work at 700px and 960px; a `secret` flag on sessions (schema v5) that settles the hide-secrets question; sidebar section reordering; a code-split bundle (193 kB entry chunk, 51 kB gzipped, vendors and every off-screen view in their own chunks, fonts trimmed to latin subsets); JSON and Markdown export plus JSON import with a preview; restore-from-backup with restore-as-new and a two-step replace; a polish pass on dialog focus and the Parchment web; and six dark-theme screenshots in `docs/screenshots/`.

**Schema is v5.** v3 added `transactions[]` and `goals[]`, v4 `Entry.portrait`, v5 `Session.secret`. Every step has a migration in `src/server/migrations.ts` and was exercised on both local characters with a backup taken first. The example character ships at v5.

## Next Up
1. **Phase 4b — Release**, in the ROADMAP order: Electron portable `.exe` with `data/` beside the exe, then the OS-level capture hotkey (`globalShortcut` → a small always-on-top capture window that posts to the same API), then the GitHub Actions release workflow, README with the screenshots, CONTRIBUTING and issue templates, v1.0.0.
2. Before Electron: decide how the packaged app finds `data/` (`src/server/paths.ts` reads `WJ_DATA_DIR`; the Electron main process should set it to `path.join(path.dirname(process.execPath), 'data')` for the portable build).
3. The README hero is `docs/screenshots/web.png`. The other five are ready to drop into a features section.

## Open Questions
- Final project name: "Wayfarer's Journal" is the working name (kept in one config constant).
- The example character's ids are readable strings (`p-sigunn`, `t-shield-bands`). New records use nanoid. Both are valid.
- Ledger counterparties are People only. Places or factions as counterparties would need a different web edge; left for a real request.
- Should the Markdown export get a per-section toggle (e.g. "leave out the ledger")? Today it is all-or-nothing apart from secrets.

---

## Session Log
Newest first. Copy this template for each session:

```
### Session N — YYYY-MM-DD
**Goal:**
**Done:**
-
**Decisions:**
-
**Build / typecheck:** pass | fail (details)
**Known issues:**
-
**Next:**
-
```

### Session 4 — 2026-09-22
**Goal:** Push to GitHub, then Phase 4a items 1–8 in order, one commit each.

**Done:**
- **Pushed** `main` to `origin` (the user asked explicitly; the remote had no branch yet).
- **Narrow-width pass.** Web on small canvases: one scrolling chip row, hub-only labels, automatic fit-to-view once the layout settles (plus a Fit button), one-line legend; rail scrollbar fixed; field-editor icons no longer squeezed. Checked at 700px and 960px.
- **Sessions can be secret (schema v5).** Toggle, list marker, veils, exclusions from backlinks and palette; 4→5 migration writes `secret: false`; verified with v4 backups. Captures stay unblurred, balances stay visible — reasoning in DESIGN.
- **Sidebar reordering.** Grip on hover in the full sidebar (drag or arrows via `useReorder`); Move up / down in every section's menu (`SectionMenu`, shared with the compact list header).
- **Bundle.** Vendor chunks `react`, `radix`, `markdown`, `d3`; lazy routes for web, ledger, goals, sessions, inbox, palette, tag manager, field editor, goal dialog, character select, export/import/backups dialogs. `styles/fonts.css` declares latin + latin-ext only via a `~fonts` alias. Entry chunk 663 → 193 kB; fonts 507 → 332 kB; no Vite warning.
- **Export / import.** `lib/download.ts`, `lib/exportMarkdown.ts`, `ExportMarkdownDialog` (says whether secrets go in), `ImportCharacterDialog` (drop or pick, server dry-run preview, import as new). `POST /api/characters/import` with `commit`. Reachable from the switcher menu, palette, and character select.
- **Restore from backup.** `GET /:id/backups`, `POST /:id/restore` (`new` | `replace`), `BackupsDialog` with two-step replace; the replaced version is backed up first by the ordinary save path. Backup file names validated against traversal.
- **Polish.** Modals focus their first field (or the confirm button); web "mentions" edges use the line token so Parchment stays soft; both themes checked on the Phase 2/3 views.
- **Screenshots.** `docs/screenshots/{web,entry,ledger,goals,palette,characters}.png`, dark theme, 1440px wide (entry at 1150px tall so title and backlinks both fit). The character-select capture had the user's real character card removed from the DOM before capture; only the fictional example appears.
- **Verified in Chrome** at each step: import dry-run/commit/cleanup, restore-as-new/replace with a fresh backup, sidebar keyboard and pointer reordering persisted, session veils, lazy chunks on the production build served on 4777, fonts loading from the trimmed set.

**Decisions:** Captures stay unblurred and balances visible in hide-secrets mode; a hand-written `fonts.css` instead of the packages' all-subset CSS; imports and restores never overwrite except the explicit two-step "Replace current", which itself backs up first. In the DESIGN Decision Log and section notes.

**Build / typecheck:** pass. `npm run typecheck` clean on both projects; `npm run build` succeeds with no size warning.

**Known issues:**
- Two ledger-row date labels still wrap at 700px ("Sun, Aug 23"); cosmetic.
- Markdown export is all-or-nothing apart from secrets (see Open Questions).
- The web's auto-fit can zoom out far on very sparse graphs; the Fit button and wheel zoom recover.
- `data/_import/` still holds the Session 2 import script and source files; gitignored.

**Next:** Phase 4b — Electron packaging first.

### Session 3 — 2026-09-22
**Goal:** Finish the two Phase 2 leftovers, seed the example with a capture and a session, then build Phase 3 items 1–7 in order, one commit each.

**Done:**
- **Phase 2 leftovers.** ↑/↓/Home/End/Enter in the entry and session lists with focus moving into the detail title (`lib/listKeys.ts`); the list search box counts matches elsewhere and opens the palette with the query (roadmap item marked superseded); example gains a capture and a session.
- **Ledger + Goals (schema v3)** — `LedgerView`, `GoalsView`, `GoalCard`, `GoalDialog`, `Dealings`, `lib/ledger.ts`. Running balance over all transactions even when filtered, month subtotals, filters by person / tag / goal with totals in view, one-line quick entry with a Spent/Earned toggle and `@person` autocomplete, inline row editor, goals with remaining / percent / days left / per-week figure, quick payment line per goal, tiles on the Overview, Dealings on every person. Migration exercised on both local characters with v2 backups.
- **Relationship web** — `lib/graph.ts` + `WebView` on d3-force. Ties from `[[links]]`, shared locations and ledger dealings; colour by section, size by ties, standing as edge opacity; hover, click, drag, pan, zoom, shake, tag filter, legend. Example bodies rewritten with `[[links]]` (19 entries) so the web is worth a screenshot.
- **Field editor** — `FieldsDialog` from every section's menu: add, rename, reorder, kinds, choice options, data-aware removal with the affected count; People's standing locked.
- **Hide-secrets mode** — `settings.hideSecrets`, `ui/Veil` with click-to-reveal, toggles in both sidebars and the palette, a banner while on; secrets left out of the web, backlinks, palette, entry picker and dealings.
- **Portraits (schema v4)** — `lib/portrait.ts` (square crop, ≤256px JPEG), `PortraitPicker` (paste / drop / file), `Sigil` shows the image everywhere including web nodes. Identity 3→4 migration exercised with v3 backups.
- **Reordering** — `lib/useReorder.ts`; grips on profile sections (real now) and fields (on hover); keyboard arrows on the grip.
- **Docs.** DESIGN: v3 and v4 data model, ledger/goal semantics, web, field editor, hide-secrets, portraits, reordering, five new Decision Log entries. ROADMAP: all Phase 3 boxes bar one ticked.
- **Verified in Chrome** at 1440px: every feature above end to end, including the quick entry saving to disk, goal math, the web with 28 ties and a hover neighbourhood, field removal confirmation, secrets hidden across five surfaces, a dropped image landing as a 256px JPEG, and keyboard + pointer reordering persisted. Test data was reverted through the storage layer afterwards.

**Decisions:**
- Transactions carry `secret` from v3 (hide-secrets needed it one item later). Debt-goal progress is the negative sum of its transactions. Counterparties are People only. d3-force alone with hand-drawn SVG, character pinned at the centre. Portraits inline as data URLs; v4 bump despite an empty migration. All in the DESIGN Decision Log.
- Bash could not fork on this machine this session; all shell work ran through PowerShell. A `Remove-Item` on a `%TEMP%` path was blocked by a path-safety rule once; the commit-message temp file is now simply overwritten each time.

**Build / typecheck:** pass. `npm run typecheck` clean on both projects; `npm run build` succeeds (one ~620 kB chunk, Vite warns; Phase 4).

**Known issues:**
- The bundle grew with d3-force and seven new views; code-splitting is overdue.
- Hide-secrets mode does not hide balances, session bodies or capture text (none of those carry a secret flag).
- The web's tag chips and header take vertical room at narrow widths; not yet checked below 960px.
- Same-section namesakes still cannot be told apart by the link syntax (carried over from Session 2).
- `data/_import/` still holds the original import script and source files from Session 2; gitignored, untouched.

**Next:** Phase 4, starting with the polish pass and bundle split; the README hero screenshot from the Web view.

### Session 2 — 2026-09-22
**Goal:** Recover from a crashed session (API outage mid-work), then build Phase 2 items 1–6 in priority order, committing after each.

**Done:**
- **Recovery.** Reconstructed state from the repo rather than the stale PROGRESS.md: the crashed session had imported the real character and written the v2 schema + migration but no client code. Verified the import structurally (counts only), accepted the "sessions carry no entryIds" decision, exercised the migration for real (both characters now v2 on disk, v1 backups in `data/backups/<id>/`), and committed the schema work.
- **Links** (`lib/links.ts`, `lib/remarkWikiLinks.ts`, `lib/caret.ts`, `LinkTextarea`, `LinkAutocomplete`, `WikiLink`, `NewEntryDialog`). `[[Title]]` / `[[Title|Type]]`; caret-anchored autocomplete with section icons; case-insensitive resolution, oldest namesake wins; `renameEntry` rewrites every link in one mutation; dashed unresolved chips create the entry.
- **Backlinks** (`Backlinks.tsx`): one row per source (entry, profile section, capture, session) with the sentence around the first mention, computed at render time.
- **Narrow layout** (`lib/layout.ts`, `SidebarRail`, `CharacterMenu`): `wide` (1200px) and `pane` (960px) breakpoints shared by Tailwind and JS; icon rail with tags popover; single-pane list/detail with a back action; auto-fit field columns.
- **Command palette** (`CommandPalette.tsx`, `lib/fuzzy.ts`, `lib/keys.ts`): Ctrl+K, grouped results, create-as-any-type, character switch, theme toggle, shortcut printed in both sidebars.
- **Quick capture + Inbox** (`QuickCapture`, `InboxView`, `EntryPicker`): Ctrl+/, Enter / Ctrl+Enter / Shift+Enter semantics, convert / append / two-step dismiss, count in sidebar and rail badge.
- **Session log** (`SessionsView.tsx`): month-grouped timeline, date picker, "This session touched" chips, sessions as backlink sources, palette integration.
- **Docs.** DESIGN: link syntax and resolution, layout modes, palette, capture, sessions, six Decision Log entries. ROADMAP: six Phase 2 boxes ticked, Phase 4 gains the Electron OS-level hotkey item, the old "responsive below 1000px" Phase 4 item removed as done.
- **Verified in Chrome** at 1440px, 1100px and 720px: autocomplete, chips, create-from-link, rename rewrite persisted to disk, backlinks, rail + single-pane flow with back, palette navigation, capture → Inbox → append to entry, session → backlinks → session. Console clean at the end of each item.

**Decisions:**
- Links stay as text; namesakes resolve oldest-first; `[[…]]` handled as a remark plugin (not string replacement); icon rail instead of a drawer; `Ctrl+/` for capture (nothing in Chrome/Edge/Firefox uses it); schema v2 ships captures and sessions in one migration; sessions have no `entryIds`. All in the DESIGN Decision Log.
- Navigation callbacks read the live store (`getDocument()`) rather than a `doc` closure, after a stale-closure bug stopped "create from link" from opening the new entry.

**Build / typecheck:** pass. `npm run typecheck` clean on both projects; `npm run build` succeeds (one ~580 kB chunk, Vite warns; Phase 4).

**Known issues:**
- The capture hotkey is in-app only; the game window keeps the keys. Phase 4 Electron item.
- Two entries with the same title in the *same* section cannot be told apart by the link syntax; the oldest wins.
- The fuzzy matcher still admits a few loose in-order matches on long field text (e.g. a three-letter query hitting a role description).
- Bundle grew to ~580 kB; code-splitting remains a Phase 4 task.
- The local copy of the example character in `data/` now contains one demo session ("The Whiterun run") left from verification; the other test edits were reverted through the storage layer. `examples/example-character.json` is untouched.

**Next:** Keyboard navigation of the entry list and the "search across sections" decision, then Phase 3 starting with the ledger.

### Session 1 — 2026-09-22
**Goal:** Build all of Phase 1 — Foundation.

**Done:**
- **Scaffold.** Vite + React 18 + strict TypeScript + Tailwind 3, Express API, zod schemas shared by both. Two tsconfig projects (client/server) behind `npm run typecheck`. `scripts/dev.mjs` runs the API and Vite together so `npm run dev` is one command on every platform.
- **Storage.** `src/server/storage.ts`: temp-file-plus-rename atomic writes with `fsync`, a pre-overwrite backup pruned to the newest 20, sequential `schemaVersion` migrations (`migrations.ts`, wired and empty at v1), and unknown top-level keys preserved across a read/write round trip. Character ids are filename-validated. Deleting a character keeps its backups.
- **API.** All eight routes from DESIGN §3, with typed errors mapped to 400/404/500 and a JSON error body the client surfaces verbatim.
- **Client.** A `useSyncExternalStore` document store with 800 ms debounced full-document autosave, an always-visible Saved / Saving… / Not saved indicator (with retry), and a flush on `pagehide` and on character switch.
- **UI.** Character select; sidebar shell with character switcher, per-type counts, custom sections and a tag list that filters; two-pane entry views with search, sort, tag filter, pin and secret; Quests with status badges and progress bars; Overview/profile with editable fields and markdown sections; tag manager; new-section dialog with icon and colour pickers; empty states on every surface.
- **Visual design.** Original "firelit ledger" look: warm near-black surfaces, muted gold accents, a fixed firelight glow and paper-grain layer, hairline rules, a lozenge divider motif, Cinzel for headings / Inter for UI / EB Garamond for long-form. Dark and Parchment themes from the same CSS-variable tokens. No game assets or trademarked imagery.
- **Example character.** Sivrid Coal-Hand — original and fictional, 34 entries, 20 grouped tags, a custom section, quests in four statuses, two progress counters, secrets, and a written backstory.
- **Launchers.** `start.bat` (checks for Node ≥ 20 with a download link if missing, installs and builds on first run, opens the browser when the server is ready), `stop.bat`, `start.sh`. `.gitattributes` forces CRLF on `.bat` so the launchers survive a clone on any platform.
- **Repo.** README (non-developer install instructions, data locations, developer notes, disclaimer), MIT LICENSE, `.gitignore` with `data/` excluded.
- **Verified in a real browser** (Chrome DevTools): every screen in both themes, entry creation, autosave round-tripping to disk, inline tag creation persisting with the chosen colour, the REST API exercised end to end including backup creation and error cases. Console clean.

**Decisions:** Nine new entries in the DESIGN Decision Log. The load-bearing ones: run the server with `tsx` in production rather than compiling it (no ESM extension friction, one source of truth); hand-rolled client store instead of a state library; local-draft text fields so typing is not gated on cloning the document; palette *keys* rather than hex on tags so colours follow the theme; fonts bundled locally so the app works offline.

**Build / typecheck:** pass. `npm run typecheck` clean on both projects; `npm run build` succeeds (one ~544 kB JS chunk — Vite warns, noted as Phase 4 work).

**Known issues:**
- The layout assumes a wide window; below roughly 1000px the sidebar + list + detail panes crowd. Listed under Phase 4.
- The client ships as a single ~544 kB chunk, and `@fontsource` pulls in Cyrillic/Greek/Vietnamese subsets that are never requested at runtime but do sit in `dist/`. Phase 4.
- The grip handle on profile sections is decorative — reordering is not implemented. Moved to Phase 3.
- Two bugs found and fixed during browser verification, worth remembering: a Tailwind `animation` with `fill-mode: both` overrides `-translate-x-1/2` utilities (modals were rendering off-centre until the centring transform was moved into the keyframes); and naive `replace(/s$/,'')` singularisation produced "New people", which `lib/words.ts` now handles.

**Next:** Phase 2 — `[[Entry Title]]` links first, then backlinks, then Ctrl+K. Quick capture is the change that will need schemaVersion 2 and the first real migration.

### Session 0 — Planning
**Goal:** Define scope, architecture, data model, and roadmap.
**Done:**
- Wrote CLAUDE.md, docs/DESIGN.md, docs/ROADMAP.md, docs/PROGRESS.md.
**Decisions:** See the Decision Log in DESIGN.md.
**Build / typecheck:** n/a (no code yet)
**Next:** Phase 1.
