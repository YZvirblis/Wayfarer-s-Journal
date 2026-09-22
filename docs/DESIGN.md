# Wayfarer's Journal — Design Document

## 1. Vision
A beautiful, local-first journal for Keizaal Online roleplayers. It replaces the cluttered text files players keep open while playing: character sheets, lists of people met, tasks, deals, and notes.

It should feel like a well-kept adventurer's ledger: fast to jot into mid-scene, pleasant to browse, and good at answering "who was that Khajit in Whiterun and what did I promise him?"

### Audience
- **Primary:** Keizaal players, mostly on Windows, mostly **not** developers. They should be able to download one file and run it (Phase 4: portable .exe).
- **Secondary:** developers who clone the repo, run it with `start.bat`, and contribute.

### Principles
1. **Local and private.** No accounts, no cloud, no telemetry. The user's data is plain JSON they own.
2. **Never lose data.** Atomic writes, rolling backups, versioned schema with migrations.
3. **Fast capture, organized later.** Writing something down mid-RP must take seconds.
4. **Structured but flexible.** Sensible built-in types, plus user-defined sections and tags.
5. **Screenshot-worthy.** The visual design is a feature. The project's reach depends on it.
6. **RP-safe.** Support marking things as secret and hiding them, so players can share screenshots without leaking IC secrets.

## 2. Tech Stack
| Layer | Choice |
|---|---|
| Frontend | Vite + React + TypeScript + Tailwind CSS |
| Icons | lucide-react |
| UI primitives | Radix (headless, accessible) where useful |
| Backend | Small Node server (Express or Fastify), TypeScript, `tsx` in dev |
| Validation | zod schemas shared between client and server |
| IDs | nanoid |
| Package manager | npm |
| Distribution (Phase 4) | Electron portable .exe via GitHub Releases |

### Architecture
- A single npm package. In production, one Node process serves both the API and the built frontend.
- The server binds to `127.0.0.1` only. Default port `4777`, overridable via env var.
- The storage module has a clean interface, independent of the HTTP layer, so it can later run inside Electron's main process unchanged.
- The client loads a whole character document into state and autosaves the full document with a debounce (~800 ms). Data is small, so full-document saves are simpler and safer than partial updates.
- A save-status indicator is always visible: Saved / Saving… / Error.

### As built (Phase 1)
```
src/shared    schema.ts (zod, the file format), defaults.ts (built-in types, new-character factory)
src/server    index.ts (Express + static), api.ts (routes), storage.ts (atomic writes, backups),
              migrations.ts (version steps), paths.ts (data dir, port)
src/client    App.tsx (boot + character routing), components/, lib/, styles/index.css (design tokens)
scripts       dev.mjs (runs the API and Vite together)
```
- **Client state** is a hand-rolled store over `useSyncExternalStore` (`lib/documentStore.ts`). Every write goes through `mutate(recipe)`, which mutates a `structuredClone` of the document, stamps `updatedAt`, and queues the debounced save. No state library.
- **Text fields** keep a local draft and commit after a ~220 ms pause (`lib/useAutoCommit.ts`), so a keystroke never triggers a full-document clone. Fields are keyed by the record they edit, so switching records remounts them.
- **Themes** are CSS variables holding space-separated RGB channels, mapped into Tailwind so `/alpha` modifiers keep working. Switching theme flips `data-theme` on `<html>`; an inline script in `index.html` applies the remembered value before first paint.
- **Ports:** API `4777` (`WJ_PORT`), Vite dev server `4778` proxying `/api` to the API.

## 3. Storage
```
data/                          (gitignored; location overridable via env var)
  settings.json                app settings (theme, last opened character, etc.)
  characters/
    <characterId>.json         one file per character
  backups/
    <characterId>/
      <timestamp>.json         rolling, newest 20 kept
```
- **Atomic writes:** write to a temp file in the same directory, then rename over the target.
- **Backups:** before each overwrite, copy the existing file into `backups/`, then prune to 20.
- **Schema versioning:** every character file has `schemaVersion`. On load, run migrations sequentially up to the current version. Never silently drop unknown fields.

### API (Phase 1)
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/characters` | List character summaries (id, name, race, trade, entryCount, updatedAt) |
| POST | `/api/characters` | Create a character |
| GET | `/api/characters/:id` | Get a full character document |
| PUT | `/api/characters/:id` | Save a full character document (validated) |
| DELETE | `/api/characters/:id` | Delete a character (backups are kept) |
| POST | `/api/characters/:id/duplicate` | Duplicate a character |
| POST | `/api/characters/example` | Copy the example character into data |
| GET/PUT | `/api/settings` | App settings |

## 4. Data Model (schemaVersion 1)
```ts
interface CharacterDocument {
  id: string;
  schemaVersion: number;
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  profile: Profile;
  tags: Tag[];
  entryTypes: EntryType[];
  entries: Entry[];
  // Phase 2+: sessions, captures, ledger, goals — added via migrations
}

interface Profile {
  name: string;
  portrait?: string;               // data URL; optional
  fields: ProfileField[];          // ordered; defaults: Race, Age, Birthplace, Birth Sign, Trade
  sections: ProfileSection[];      // ordered; defaults: Backstory, Personality
}
interface ProfileField   { id: string; label: string; value: string; }
interface ProfileSection { id: string; title: string; body: string /* markdown */; secret: boolean; }

interface Tag {
  id: string;
  name: string;
  color: string;       // from a curated palette
  group?: string;      // optional free text, e.g. "Location", "Faction", "Role"
}

interface EntryType {
  id: string;
  name: string;        // e.g. "People"
  icon: string;        // lucide icon name
  color: string;
  builtIn: boolean;
  fields: FieldDef[];
  features: { status?: boolean; progress?: boolean };
}
interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "select" | "number";
  options?: string[];  // for select
}

interface Entry {
  id: string;
  typeId: string;
  title: string;
  tagIds: string[];
  fields: Record<string, string | number>;
  body: string;                    // markdown; Phase 2 adds [[Entry Title]] links
  status?: "active" | "on_hold" | "done" | "failed";
  progress?: { current: number; target: number };
  pinned: boolean;
  secret: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Built-in entry types
| Type | Fields | Features |
|---|---|---|
| People | role (text), location (text), standing (select: Close / Known / Met) | — |
| Places | hold/region (text) | — |
| Factions | base (text) | — |
| Quests | — | status, progress |
| Notes | — | — |

Users can create custom entry types (sections) with a name, icon, and color in Phase 1. A field editor for custom types arrives in Phase 3, but the schema already supports it.

### Planned additions (future schema versions)
- **Links (Phase 2):** `[[Entry Title]]` in any markdown body links to an entry. Backlinks are computed at runtime, not stored.
- **Sessions (Phase 2):** `{ id, date, title, body, entryIds }`, a dated timeline of play sessions.
- **Captures (Phase 2):** quick notes jotted mid-scene, waiting to be filed or converted into entries.
- **Ledger (Phase 3):** `{ id, date, amount, description, entryIds, tagIds }` in septims.
- **Goals (Phase 3):** `{ id, title, target, deadline?, kind: "save" | "debt" }`, with progress derived from the ledger.

## 5. UI / UX

### Screens (Phase 1)
1. **Character select:** cards with name, race, trade, and last updated. Actions: create, duplicate, delete (two-step confirmation), load example character.
2. **Main layout:**
   - **Left sidebar:** character switcher; Overview; one item per entry type with counts; "+ New section"; tag list with colored chips (click to filter).
   - **Main area:** a two-pane list + detail view per entry type. The list has text search, tag filter, sort (updated / title), and pinned items first. Quests show status badges and progress bars.
   - **Detail pane:** editable title, type-specific fields, tag picker (pick existing or create inline), markdown body with edit/preview toggle, pin, secret flag, timestamps.
3. **Overview:** profile fields and sections, rendered beautifully when not editing.
4. **Tag manager:** rename, recolor, group, delete (removes the tag from all entries).

### UX rules
- Empty states teach the user what to do next. No dead ends.
- Every destructive action is confirmed. Deleting a character keeps its backups.
- Keyboard-friendly throughout. Phase 2 adds Ctrl+K and a quick-capture hotkey.
- Autosave everywhere. There are no Save buttons.

## 6. Visual Design
- **Mood:** dark, warm, Nordic-inspired, like an old leather-bound ledger by firelight.
- **Dark theme (default):** deep charcoal / near-black surfaces, warm parchment-toned text, muted gold accents, subtle borders, and a restrained decorative divider motif.
- **Light theme ("Parchment"):** warm paper tones and ink-dark text, toggleable.
- **Typography:** Cinzel (or similar) for headings; a highly readable UI font (e.g. Inter); EB Garamond or similar for long-form sections such as backstory.
- **Motion:** subtle, quick transitions. Nothing that slows down use.
- All colors and fonts are defined as CSS variables / design tokens so themes can be swapped.
- **IP:** no Bethesda or Skyrim logos, assets, or trademarked imagery. The look is original and lore-friendly.

## 7. Privacy & Community Rules
- `data/` is never committed. Real player data never goes in the repo.
- The example character (`examples/example-character.json`) is fictional and original.
- The README states: *Unofficial fan tool. Not affiliated with Bethesda or the Keizaal Online team.*
- Secret flags exist so players can hide IC secrets (Phase 3 blur mode) when sharing screenshots or streaming.

## 8. Conventions
- Strict TypeScript. zod schemas are the single source of truth for types.
- Folder structure: `src/client`, `src/server`, `src/shared` (or equivalent — document here if different).
- Small, focused components. No dead code.
- Scripts: `npm run dev`, `npm run build`, `npm start`, plus `start.bat`, `stop.bat`, `start.sh`.

## 9. Decision Log
Record significant decisions here, newest first.

| Date | Decision | Reason |
|---|---|---|
| 2026-09-22 | Run the server with `tsx` in production instead of compiling to `dist/server`; `npm run build` builds the client only | Removes ESM-extension friction on Windows and keeps one source of truth. Startup cost is negligible for a local single-user app, and the Phase 4 Electron build will bundle anyway. `tsx` is therefore a runtime dependency, not a dev one. |
| 2026-09-22 | Hand-rolled client store over `useSyncExternalStore` rather than a state library | ~150 lines, no dependency, and the clone-the-whole-document write model mirrors the save-the-whole-document API |
| 2026-09-22 | Text fields hold a local draft and commit on a pause (`useAutoCommit`) | Typing must not be gated on cloning the document; the alternative was partial-update APIs, which §2 rules out |
| 2026-09-22 | Fonts bundled locally via `@fontsource-variable/*`, not Google Fonts | The app has to look right with no internet connection |
| 2026-09-22 | Tags and entry types store a palette **key** (`gold`, `frost`, …), never a hex value | Colours then follow the active theme, so one tag reads correctly in both Dark and Parchment |
| 2026-09-22 | `CharacterSummary` carries `entryCount` beyond the fields listed in §3 | The character-select cards needed something to say besides a name and a date, and it is free to compute while loading each file |
| 2026-09-22 | Unknown top-level keys are merged back over the validated document on read and write | zod strips what it does not know. A file written by a newer build (sessions, ledger…) must survive a round trip through an older one — see §3 "never silently drop unknown fields" |
| 2026-09-22 | Custom entry types have no `singular` field; the client derives it (`lib/words.ts`) | Avoids asking the user a grammar question when creating a section, and avoids a schema field that would need a migration |
| Planning | JSON files, one per character, instead of a database | Small data; human-readable; easy backup; zero setup for users |
| Planning | Full-document saves with debounce | Simpler and safer at this data size |
| Planning | Local Node server now, Electron .exe in Phase 4 | Fast to develop; most Keizaal players won't install Node, so a one-file release is needed for adoption |
| Planning | Everything is an Entry with a Type; users can add types | One flexible model covers people, places, quests, and custom sections |
| Planning | Fictional example character, real data gitignored | Avoids leaking IC secrets / metagaming; protects player privacy |
