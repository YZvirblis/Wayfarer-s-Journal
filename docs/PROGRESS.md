# Progress

Read this file first at the start of every session. Update it at the end of every session.

## Current Status
**Phase:** 2 — Connections & Capture, in progress. Schema v2 (captures + sessions) is in place with a verified 1→2 migration; a real player's character was imported locally into `data/` via a script that lives in the gitignored `data/_import/` folder (never committed, no details recorded here).

The app runs end to end. `start.bat` (or `npm run dev`) launches an Express API on `127.0.0.1:4777` that serves the built React client. A character's whole document lives in one JSON file under `data/characters/`, is validated by the shared zod schema on every read and write, is written atomically, and keeps the last 20 versions in `data/backups/<id>/`.

Everything on the Phase 1 checklist in `docs/ROADMAP.md` is ticked: character select, the sidebar shell with a character switcher and per-type counts, the two-pane list + detail view with search / tag filter / sort / pin / secret, the five built-in types (Quests with status and an optional progress counter), user-created sections, tags with inline creation and a tag manager, the Overview/profile page, markdown with a Read/Write toggle, Dark + Parchment themes, and empty states everywhere.

The bundled example character is **Sivrid Coal-Hand** (`examples/example-character.json`) — a fictional Nord smith with 34 entries across six sections (including a custom "Rumours" section), 20 grouped tags, quests in four different statuses with two progress counters, secret entries, and a full profile with backstory. It is loaded via `POST /api/characters/example`, which copies it into `data/` under a fresh id.

`docs/DESIGN.md` §2 now has an "As built" section describing the real folder layout, the client store, and the theming approach. Nine new entries were added to its Decision Log.

## Next Up
Start **Phase 2 — Connections & Capture**, in this order:

1. `[[Entry Title]]` links — a remark plugin in `components/Markdown.tsx` plus an autocomplete in the `MarkdownField` textarea. Links resolve by title against `doc.entries`; per DESIGN §4 backlinks are computed at runtime, not stored.
2. Backlinks panel on the entry detail pane.
3. Ctrl+K command palette (search everything, jump anywhere, create entries).
4. Quick capture → inbox. This is the first change that needs a **schema bump to version 2** plus a migration in `src/server/migrations.ts` — see the `migrations` map there, which is wired up and currently empty by design.

Before writing Phase 2 code, run `npm run dev` and click through the example character once; it is the fastest way to reload the shape of the app.

## Open Questions
- Final project name: "Wayfarer's Journal" is the working name (kept in one config constant).
- The example character's ids are readable strings (`p-sigunn`, `tag-riften`). New entries use nanoid. Both are valid — worth deciding whether to normalise the example on the next touch.

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
