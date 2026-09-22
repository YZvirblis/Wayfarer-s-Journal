# Progress

Read this file first at the start of every session. Update it at the end of every session.

## Current Status
**Phase:** 2 — Connections & Capture, **core items complete** (six of the eight roadmap boxes). Two smaller Phase 2 items remain: keyboard navigation of the entry list, and search across every section from the list's search box (the palette already searches everything).

The app runs end to end at any width from ~600px up. Everything a body of markdown can do now connects: `[[Entry Title]]` links with caret autocomplete, chips that navigate, unresolved links that offer to create the entry, rename-rewriting, and a "Mentioned in…" panel on every entry. `Ctrl+K` opens a command palette that reaches entries, sessions, sections, profile sections, tags, creation of any type, and other characters. `Ctrl+/` opens quick capture; captures wait in an Inbox to be turned into entries, appended to one, or dismissed. A dated session log lists what each night touched, and those entries list the session back.

**Schema is v2** (`captures[]`, `sessions[]`), with a verified additive 1→2 migration. Both local characters (the example and a real imported one) were upgraded through the storage layer with v1 backups taken first. A real player's character was imported into `data/` by a script kept in the gitignored `data/_import/` folder — no details recorded here, nothing committed.

`docs/DESIGN.md` documents the link syntax and resolution rules, the three layout modes, the palette, quick capture, and the session log, with six new Decision Log entries.

## Next Up
1. **Remaining Phase 2 polish:** ↑/↓ + Enter in the entry list; make the list search box optionally search all sections (or drop that box in favour of the palette and tick the item as superseded).
2. **Phase 3 — Depth**, starting with the ones the data model already anticipates: the septim ledger, then goals. See DESIGN §4 "Planned additions".
3. Before Phase 3 code, click through the example character once at 1440px and once at ~700px; the narrow layout is new and worth a second pair of eyes.

Known rough edges to keep in mind (all listed under Known issues in the Session 2 log): the in-app capture hotkey only works while the journal window has focus (the OS-level hotkey is a Phase 4 Electron item), same-section namesakes cannot be told apart by `[[Title|Type]]`, and the client bundle is now ~580 kB in one chunk.

## Open Questions
- Final project name: "Wayfarer's Journal" is the working name (kept in one config constant).
- The example character's ids are readable strings (`p-sigunn`, `tag-riften`). New entries use nanoid. Both are valid — worth deciding whether to normalise the example on the next touch.
- Should the example character ship with a sample session and a capture or two, so the Sessions and Inbox views are not empty on first open? (The `examples/` file is still v1-shaped and is migrated on load.)

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
