# Wayfarer's Journal — Design Document

## 1. Vision
A beautiful, local-first journal for roleplay characters — born on Keizaal Online, useful on any server or table. It replaces the cluttered text files players keep open while playing: character sheets, lists of people met, tasks, deals, and notes.

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
| Graph layout | d3-force (Phase 3), SVG rendered by hand |
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

### Desktop app (Phase 4b)
The portable `.exe` is a wrapper, not a rewrite. `electron/main.ts` picks a data folder and a free loopback port, sets `WJ_DATA_DIR` and `WJ_PORT`, and only then loads `electron/server.ts` — a second bundle that starts the very same Express app (`src/server/app.ts`, `startServer()`) in-process and loads it in a `BrowserWindow`. Storage, migrations and the API are untouched; `npm start`, `start.bat` and `npm run dev` keep working exactly as before.

- **Build:** `vite.electron.config.ts` compiles `main` and `server` to CommonJS in `dist/electron/` with zod and nanoid bundled and express external; electron-builder packs `dist/`, `examples/`, the preload and the icon with `asar: false` into a single portable exe (`npm run electron:build` → `release/`). Client-only libraries are devDependencies so they never ship inside the exe. `npm run icon` renders `assets/icon.svg` with Electron's own renderer into `build/icon.png` and a PNG-wrapped `build/icon.ico`; both are generated, never committed.
- **Data folder:** `data/` beside the executable (`PORTABLE_EXECUTABLE_DIR`), or the project folder in development. If that is not writable, the app falls back to `%APPDATA%\wayfarers-journal\data` and says so once in a dialog; Preferences shows the path in use, and `GET /api/app` reports it.
- **Window:** size, position and maximised state persist in `%APPDATA%\wayfarers-journal\window-state.json`; the title follows the open character; links open in the system browser (`setWindowOpenHandler` plus `will-navigate`); the application menu is off; a single-instance lock re-shows the window.
- **Tray:** Open, Quick capture, Quit. With *Keep running in the tray* on (the default), closing the window hides it and a one-time balloon explains why. The main process reads the setting from `settings.json` and hears changes through `serverEvents` (emitted by `PUT /api/settings`).
- **Global capture:** `electron/hotkey.ts` listens for `settings.desktop.captureHotkey` (default `CommandOrControl+Shift+J`) and re-arms on every change; the status (registered or not, which backend, a running test) goes into `appInfo.hotkey`, which Preferences shows. The hotkey opens a 560×220 frameless, always-on-top, taskbar-less window on `/capture` (`CapturePage`): Enter sends the text over IPC to the main window, whose store adds it to the open journal (so the next autosave carries it); if no journal is open the main process writes it to the last-opened character itself (`captureToLastCharacter`, also `POST /api/captures`). Escape, Enter, or the hotkey again closes the window; a click elsewhere closes it too but leaves focus where the player put it.
- **Hotkey backend (Session 6):** Electron's `globalShortcut` is `RegisterHotKey`, which never fires while a game reads the keyboard through DirectInput. The app therefore installs a low-level keyboard hook (`WH_KEYBOARD_LL`, through `uiohook-napi`, a prebuilt N-API module) and matches each key-down against the one parsed combination — modifiers must match exactly, auto-repeat is ignored, mouse events are not subscribed to, nothing is stored — falling back to `globalShortcut` only if the hook fails to load or cannot express the key. `parseAccelerator` maps Electron's accelerator names to uiohook keycodes. The hook is released in `before-quit`.
- **Foreground (Session 6):** Windows only lets the process that received the last input steal the foreground; `RegisterHotKey` grants that with `WM_HOTKEY`, a hook does not, so a plain `show()` left the capture box flashing behind the game. `electron/foreground.ts` (koffi, prebuilt, no compiler) shows the box inactive, attaches this thread's input queue to the foreground thread and calls `SetForegroundWindow` (`activate`); a blur inside the first 600 ms is treated as a refused activation and retried, not as the player leaving. On close, `restore` hands the foreground back to the window recorded when the box opened — otherwise Windows would activate the journal window, being the same process. Verified with synthetic input against Notepad: box takes focus, Enter and Escape both return it.
- **Test your hotkey:** `POST /api/app/hotkey-test` makes the main process record the next press for six seconds instead of opening the box (`appInfo.hotkey.test`); Preferences polls and shows arrived / nothing arrived.
- **Bridge:** `electron/preload.cjs` exposes only `window.wayfarerDesktop` (`onCapture`, `submitCapture`, `closeCapture`, `openCapture`) through `contextBridge`, with the sandbox on.

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
- **Bundle (Phase 4a):** the entry chunk holds the app's own code (~190 kB, ~50 kB gzipped). `vite.config.ts` splits vendors into `react`, `radix`, `markdown` and `d3` chunks so they cache independently, and everything not on screen at first paint — the web (which pulls in d3-force), ledger, goals, sessions, inbox, palette, tag manager, field editor, goal dialog, character select — is a `React.lazy` route behind a Suspense fallback. Fonts come from `styles/fonts.css`, which declares only the latin and latin-ext subsets of the three typefaces (the `~fonts` alias points into `@fontsource-variable`); the packages' other subsets never reach `dist/`.

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
| GET | `/api/characters/:id/backups` | Phase 4a. The character's backups, newest first, each parsed for its timestamp (from the file name), name, format and counts; an unreadable file is listed but flagged |
| POST | `/api/characters/:id/restore` | Phase 4a. Body `{ file, mode: 'new' \| 'replace' }`. `new` saves the backup as a separate character ("… (restored)"); `replace` saves it over the current file, which `saveCharacter` backs up first, so the replaced version becomes the newest backup |
| POST | `/api/characters/import` | Phase 4a. Body `{ document, commit }`. Validates and migrates the document; with `commit: false` returns only an `ImportSummary` (name, counts, file format before/after, duplicate-name flag); with `commit: true` saves it under a **new** id and returns the saved document. Never overwrites |
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
  // schemaVersion 2 adds captures and sessions; 3 adds transactions and goals; 4 adds Entry.portrait; 5 adds Session.secret; 6 adds Profile.currency
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
  body: string;                    // markdown; may contain [[Entry Title]] links (see "Links" below)
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

Users can create custom entry types (sections) with a name, icon, and color. Since Phase 3, every section's options menu has **Edit fields…** (`components/FieldsDialog.tsx`): add, rename, reorder (arrow buttons), change the kind between text / choice / number, and edit a choice's options as a comma-separated list. Field *keys* never change (`f-<nanoid>` for new ones), so values survive renames; removing a field that carries data asks for confirmation and states how many entries are affected, then deletes the definition and every stored value in one mutation. Built-in types are editable too, except that People's `standing` field is locked (name editable, kind and options fixed) because the relationship web reads its values.

### schemaVersion 2 (Phase 2)
Two additive top-level collections. Nothing from v1 changes shape.
```ts
interface CharacterDocument {
  // ...everything from v1, plus:
  captures: Capture[];
  sessions: Session[];
}
interface Capture { id: string; body: string /* markdown, may contain [[links]] */; createdAt: string; }
interface Session { id: string; date: string /* YYYY-MM-DD */; title: string; body: string /* markdown */; secret: boolean /* v5 */; createdAt: string; updatedAt: string; }
```
- **Sessions carry no `entryIds`.** What a session references is whatever its body links to with `[[Entry Title]]`, the same rule entries follow. There is one kind of link in the app, and a session shows up under an entry's backlinks like any other source.
- **Migration 1 → 2** (`src/server/migrations.ts`): adds `captures: []` and `sessions: []` when absent, leaves every other key untouched, and is safe to run twice. It runs in memory on every read; the upgraded document reaches disk on the next save, and `saveCharacter` copies the v1 file into `data/backups/<id>/` before overwriting it. Verified against the example character and a real imported character on 2026-09-22.

### schemaVersion 4 (Phase 3)
`Entry` gains an optional `portrait: string` (a data URL), matching the `profile.portrait` that existed since v1. The 3 → 4 migration is the identity: nothing needs transforming, but the bump makes an older build refuse the file instead of silently stripping portraits on its next save. Portraits are produced by `lib/portrait.ts`: centre-cropped to a square, scaled to at most 256px, encoded as JPEG at quality 0.86 in the browser, so a portrait costs roughly 10–25 kB inside the JSON and the file stays self-contained. `PortraitPicker` accepts a pasted image, a dropped one, or a file picker; `Sigil` shows the image when there is one and initials when there is not, everywhere a character or person appears (cards, switcher, Overview, People rows, detail pane, palette, web nodes).

### schemaVersion 5 (Phase 4a)
`Session` gains `secret: boolean` (default `false`). The 4 → 5 migration writes `secret: false` onto every existing session. This settles the hide-secrets open question: **sessions can be secret** (blurred in the list and the detail pane, left out of backlinks and the palette while the mode is on); **captures stay unblurred**, because a capture is a raw jot that has not been sorted yet and would gain nothing from a second flag; and **balances stay visible**, because the mode hides words, not arithmetic — a player who needs the total hidden can crop the screenshot, while blurring numbers would make the ledger unusable during play. Verified on both local characters on 2026-09-22 with v4 backups taken first.

### schemaVersion 6 (Phase 4b)
`Profile` gains `currency: string` (default `"septims"`). The app is a journal for roleplay characters in general; the ledger and goals name whatever the character's world counts in, editable in place on the Overview (click the currency name under the balance). The 5 → 6 migration writes `septims` onto existing journals. Nothing else in code or copy is setting-specific: the built-in Places field is "Region", placeholders are generic, and only the bundled example character keeps its Skyrim flavour.

### Links (Phase 2, no schema change)
`[[Entry Title]]` anywhere in a markdown body (entry bodies, profile sections, captures, sessions) links to an entry. Links are plain text in the file; nothing is stored beside them, and backlinks are computed at runtime.

- **Syntax:** `[[Title]]`, or `[[Title|Type]]` where *Type* is a section name (`People`, `Rumours`). A title cannot contain `[`, `]`, `|` or a line break, so such titles cannot be linked.
- **Resolution** is by title, case-insensitively, ignoring surrounding and repeated whitespace. A `|Type` qualifier restricts the match to that section; a qualifier naming no real section is ignored rather than breaking the link. Among namesakes the **oldest entry wins**, so an existing link keeps its meaning when a newer entry borrows the same title. Two namesakes in the *same* section cannot be told apart by this syntax; the qualifier only separates sections.
- **Autocomplete** opens on `[[` in the editor, filters by title, shows the section icon, and inserts `[[Title|Type]]` automatically when another entry shares the title. Typing `|` after a title narrows the list to that title's namesakes.
- **Renaming** an entry rewrites every link that resolved to it, across every body, inside the same document mutation (`renameEntry` in `lib/documentStore.ts`). If the new title collides with another entry, the rewritten links gain a `|Type` qualifier.
- **Rendering:** a resolved link is a chip in its section's colour that opens the entry. An unresolved link is a dashed, dimmed chip; clicking it offers to create the entry, defaulting to People (or to the section named in the qualifier).
- **Backlinks** ("Mentioned in…", `components/Backlinks.tsx`) are computed from the document on every render of an entry's detail pane: every body (entries, profile sections, captures, sessions) is parsed, each link resolved, and one row per source kept, with the sentence around the first mention as a snippet and a `×n` count for repeat mentions. Clicking a row jumps to the source. Nothing is cached or stored; the data is small enough that this is instant.
- **Implementation:** `lib/links.ts` (parse, resolve, rewrite, backlinks), `lib/remarkWikiLinks.ts` (a remark plugin that turns `[[…]]` text into link nodes with a private `#wj-link:` href, which the Markdown component renders as `WikiLink`), `lib/linkContext.tsx` (what Workspace provides to the renderer and the editor), `lib/caret.ts` (mirror-div caret measurement for the autocomplete popup).

### schemaVersion 3 (Phase 3)
Two more additive collections: the septim ledger and goals.
```ts
interface CharacterDocument {
  // ...everything from v2, plus:
  transactions: Transaction[];
  goals: Goal[];
}
interface Transaction {
  id: string;
  date: string;            // YYYY-MM-DD
  amount: number;          // septims; positive = income, negative = expense
  description: string;     // markdown, may contain [[links]]
  counterpartyId?: string; // a People entry
  tagIds: string[];
  goalId?: string;
  secret: boolean;
  createdAt: string;
}
interface Goal {
  id: string;
  title: string;
  kind: 'save' | 'debt';
  target: number;
  deadline?: string;       // YYYY-MM-DD
  notes: string;           // markdown
  secret: boolean;
  createdAt: string;
  updatedAt: string;
}
```
- **Goal progress is derived, never stored.** A save goal counts the sum of the transactions carrying its id; a debt goal counts the money that went *out* under its name (the negative of that sum). Remaining, percent, days to the deadline and the "per week needed" figure are all computed in `lib/ledger.ts` at render time.
- **Running balance** is computed over *every* transaction in date order even when the view is filtered, so a filtered row still shows the true balance at that point.
- **Quick entry** is one line: `40 back room at the Kettle`. The Spent / Earned toggle supplies the sign unless the line starts with `+` or `−`; typing `@` opens a counterparty autocomplete over People, and the chosen person becomes a chip beside the box rather than text in the description.
- **Deleting** an entry detaches it as a counterparty; deleting a goal detaches its transactions; deleting a tag strips it from transactions as well as entries. All in one mutation each.
- **Migration 2 → 3** adds `transactions: []` and `goals: []` when absent, like 1 → 2. Verified against the example character and the real imported character on 2026-09-22 with v2 backups taken first.
- **Ids in the example** for these collections are readable (`t-shield-bands`, `g-horse`); the app uses nanoid.

## 5. UI / UX

### Screens (Phase 1)
1. **Character select:** cards with name, race, trade, and last updated. Actions: create, duplicate, delete (two-step confirmation), load example character.
2. **Main layout:**
   - **Left sidebar:** character switcher; Overview; one item per entry type with counts (reorderable by dragging the grip that appears on hover, or with Move up / Move down in the section's menu, which is also how the icon rail reorders); "+ New section"; tag list with colored chips (click to filter).
   - **Main area:** a two-pane list + detail view per entry type. The list has text search, tag filter, sort (updated / title), and pinned items first. Quests show status badges and progress bars.
   - **Detail pane:** editable title, type-specific fields, tag picker (pick existing or create inline), markdown body with edit/preview toggle, pin, secret flag, timestamps.
3. **Overview:** profile fields and sections, rendered beautifully when not editing. Since Phase 3 both lists reorder by dragging their grip (`lib/useReorder.ts`: pointer events with a live draft order, committed once on release; ↑/↓ on a focused grip for keyboards).
4. **Tag manager:** rename, recolor, group, delete (removes the tag from all entries).

### Relationship web (Phase 3)
`components/WebView.tsx` draws People, Factions and Places as a force-directed graph with the character pinned at the centre. `lib/graph.ts` builds it from the document, with nothing stored:

- **Ties:** a `[[link]]` in either direction between two node entries ("mentions"); a person whose *usually found* field names a Place, or two people who share a location string with no such Place ("same place", dashed); and a ledger counterparty, tied to the character ("coin", gold). Ties are merged, and their weight (mentions, dealings) thickens the line.
- **Look:** node colour is the section colour, size grows with the number of ties, People edges take their opacity from the person's standing (Close, Known, Met). Hovering dims everything outside the neighbourhood and shows title, role and tie count; clicking opens the entry. Drag to move, wheel to zoom, drag the background to pan, "shake" to relayout.
- **Performance:** d3-force (the only new dependency, ~20 kB) runs the simulation; positions are written straight to SVG attributes on each tick, and React only re-renders when the data or the hover changes. Node positions are remembered across filter changes so the web does not jump.
- **Filter** by tag reuses the sidebar's tag filter state.
- **Small canvases** (under 900px wide): the tag chips become one horizontally scrolling row, only hubs (three or more ties), the character and the hovered neighbourhood keep their labels, and the settled graph is fitted to the canvas once per layout ("Fit to view" repeats it on demand). A view the player has zoomed or panned is never re-fitted behind their back.

### Hide-secrets mode (Phase 3)
`settings.hideSecrets` (persisted in `settings.json`, toggled from the sidebar footer, the rail, or the palette) blurs everything marked secret: entries in lists and in the detail pane, profile sections, goals (cards and Overview tiles), ledger lines and, since v5, sessions. `ui/Veil.tsx` wraps each of them: a blurred, non-selectable copy under a "Secret · click to reveal" pill; a click (never a hover) reveals that one item until the mode is turned off and on again. A plum banner across the top of the main area says "Secrets hidden" while it is on. Secret entries, sections, transactions and goals are also left out of the relationship web, the "Mentioned in" panel, palette results, the Inbox's entry picker and a person's Dealings, so nothing leaks through a snippet or a count. Balances still include secret transactions; the mode hides words, not arithmetic.

### Export and import (Phase 4a)
Reachable from the character switcher menu, the palette, and (import only) the character-select screen.
- **Export as JSON** downloads the full document as-is (`lib/download.ts`), named `<slug>-<date>.json`. It is the backup format; anything the app can read, it can read back.
- **Export as Markdown** (`lib/exportMarkdown.ts`) writes one readable file: profile, every section in sidebar order (quests with status and progress), sessions, a ledger summary (on hand, earned, spent, net per month, every line), goals with progress, and the inbox. Hide-secrets mode decides whether secret items go in, and the confirmation dialog says so in plain words with the count. `[[links]]` are kept as text.
- **Import** (`ImportCharacterDialog`) reads a `.json` file, asks the server to validate and migrate it without writing (`commit: false`), shows what it found — name, race, trade, counts of everything, the file format it was written by, and whether a character of that name already exists — and only then saves it as a new character, keeping the original `createdAt` but nothing else of its identity. Imports never overwrite.

### About (Phase 4b)
`AboutDialog` (sidebar footer, rail, palette, character-select footer) shows the name, the version (`__APP_VERSION__`, injected by Vite from `package.json` at build time so nothing reads it at runtime), a one-line description, three plain links (repository, Buy me a coffee, licence) that open in the system browser, and the credit. It loads no external scripts and reports nothing anywhere; `lib/appInfo.ts` holds the strings.

### Restore from backup (Phase 4a)
`BackupsDialog` (character menu, palette) lists the last twenty saves with time, age, name, file format and counts of entries, tags, ledger lines, sessions and goals. **Restore as new** creates a separate character and opens it. **Replace current** asks a second time in a modal that says the current version will be backed up first, then writes the backup over the file; the store reloads from the server's response so the screen matches the disk. Nothing is ever deleted by a restore.

### Layout modes (Phase 2)
Players run the journal beside the game, so it has to work from roughly 600px up. Two breakpoints, registered both as Tailwind screens and as media queries in `lib/layout.ts` so CSS and JS agree:

| Width | Sidebar | Main area |
|---|---|---|
| ≥ 1200px (`wide`) | Full sidebar: switcher, counts, tags | List + detail side by side |
| 960–1199px | Icon rail (`SidebarRail`): sigil menu, one icon per section with the count in its tooltip, tags in a popover, theme and save-state dots | List + detail side by side |
| < 960px (`pane`) | Icon rail | One pane: the list, or the selected entry with a "← Section" back action. Creating or picking an entry opens it; deleting returns to the list |

Custom-section rename/delete, which the rail cannot host, moves into the list header's options menu below `wide`. Detail-pane field columns follow the pane's width (an auto-fit grid), not the viewport's.

### Command palette (Phase 2)
`Ctrl+K` (`⌘K` on a Mac) opens `components/CommandPalette.tsx` anywhere inside a journal. It is the one place that reaches everything: entries (title plus field values), sections, profile sections (scrolls the Overview to the section), tags (applies the filter), "Create “…” as <type>" for every section, other characters, and the theme. Matching is `lib/fuzzy.ts`: substring first, then an in-order character match that rejects letters scattered further apart than three times the query length. With nothing typed it shows a browsable menu without the entry list. The shortcut is printed on the sidebar's "Jump to…" button and in the rail's search tooltip so nobody has to guess it.

### Quick capture and the Inbox (Phase 2)
`Ctrl+/` (`⌘/`) opens `components/QuickCapture.tsx`: one box, Enter keeps it and closes, Ctrl+Enter keeps it and stays open for the next line, Shift+Enter adds a line, Escape abandons it. The shortcut was chosen because Chrome, Edge and Firefox bind nothing to it (Ctrl+J, Ctrl+Shift+K/J/C and Ctrl+Space all collide with something); it is matched on the physical `/` key as well, for layouts where `/` needs Shift. Captures are `Capture` records (`captures[]`, schema v2) shown newest-first in the Inbox view, with a count in the sidebar and on the rail badge. Each capture can be edited in place (the same markdown editor, so `[[links]]` autocomplete), turned into an entry (first line becomes the title, the rest the body, via `NewEntryDialog`), appended to an existing entry (`EntryPicker`, joined with a blank line), or dismissed (a two-step inline button rather than a modal, since a capture is a single line). Convert and append remove the capture in the same document mutation. The in-app hotkey only works while the journal window has focus; the OS-level hotkey is a Phase 4 Electron item.

### Session log (Phase 2)
`components/SessionsView.tsx` is a timeline of `Session` records (`sessions[]`, schema v2): a list grouped by month, newest first, beside a detail pane with a date picker (defaults to today in local time), a title, and a markdown body. It follows the same narrow-window rules as entries. A session references entries only through `[[links]]` in its body; the detail pane lists every resolved link under "This session touched", and each of those entries shows the session under "Mentioned in". Sessions are searchable from the palette by title, date and opening text.

`LinkTextarea` is the shared editor primitive: an auto-growing textarea with `[[` autocomplete at the caret, used by `MarkdownField` and by quick capture.

### Floating panels (Session 6)
Every dialog, the palette, quick capture and the entry picker sit inside a fixed, full-viewport flex frame (`DIALOG_FRAME` in `ui/Modal.tsx`: centred, or top-anchored at 12vh for the palette-style ones) with a 1rem gutter on every side, and the panel is `w-full` up to its cap (`DIALOG_PANEL`). Nothing is positioned with `left-1/2 -translate-x-1/2` any more: the entrance animations use `fill-mode: both`, so a keyframe's `transform` replaced the centring translate and pushed the palette off centre (and off screen on narrow windows). The frame ignores pointer events so the overlay behind it still takes the outside click; the panel is a flex column capped at the frame's height with a scrolling body, so a tall dialog never overflows the viewport.

### Form controls and icon controls (Session 6)
- **Controls are themed in one place.** `styles/index.css` sets text, caret, placeholder, `<option>` background, checkbox accent, the disabled state and the native date/number widgets for every `input`, `textarea` and `select` in the base layer; `.wj-field` and `.wj-quiet-field` add the box. Nothing per field.
- **The colour token for the page background is `ground`, not `base`.** Tailwind's `text-base` is a font size; a colour named `base` made `text-base` also emit `color`, and the New Character input came out in the background colour. Any future token must not shadow a Tailwind utility name.
- **`IconButton` owns both the hit target and the glyph size** (`ui/Button.tsx`): `sm` is 36 px with an 18 px glyph and is the default; `md` 40/20; `lg` 44/22; `xs` 32/16 only inside dense rows (a profile field, a ledger line, a sidebar row, the field editor). The glyph size is applied by the button (`[&>svg]:…`), so an icon cannot be shrunk at the call site. Ghost buttons rest in `muted`, go `ink` on hover, stay lit while their menu is open (`data-[state=open]`), and every icon-only control carries a tooltip with its label as well as an `aria-label`. The rail's buttons are 40 px with 20 px glyphs.

### UX rules
- Empty states teach the user what to do next. No dead ends.
- Every destructive action is confirmed. Deleting a character keeps its backups. Dismissing a capture uses a two-step inline button instead of a modal.
- Keyboard-friendly throughout. Ctrl+K opens the command palette, Ctrl+/ opens quick capture; both shortcuts are printed in the UI. Every modal (`ui/Modal.tsx`) lands focus on its first field — or, for confirmations, the confirm button — rather than the Close button, traps focus while open, and closes on Escape. Lists answer ↑/↓/Enter; grips answer ↑/↓.
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
- Secret flags exist so players can hide IC secrets when sharing screenshots or streaming; hide-secrets mode (Phase 3) blurs them with click-to-reveal.

## 8. Conventions
- Strict TypeScript. zod schemas are the single source of truth for types.
- Folder structure: `src/client`, `src/server`, `src/shared` (or equivalent — document here if different).
- Small, focused components. No dead code.
- Scripts: `npm run dev`, `npm run build`, `npm start`, plus `start.bat`, `stop.bat`, `start.sh`.

## 9. Decision Log
Record significant decisions here, newest first.

| Date | Decision | Reason |
|---|---|---|
| 2026-09-22 | Floating panels are centred by a flex frame, never by a transform | The entrance keyframes carry a `transform` with `fill-mode: both`, which silently replaced `-translate-x-1/2`; a frame cannot be knocked off centre by any animation and also gives every panel the same gutters and height cap |
| 2026-09-22 | The background colour token is `ground`; `IconButton` sets glyph sizes itself | `base` shadowed Tailwind's `text-base` font size and painted an input's text in the background colour; per-site `h-3.5 w-3.5` glyphs had drifted below what a pointer can hit, so the primitive now fixes 36 px / 18 px as the floor |
| 2026-09-22 | The capture hotkey is a low-level keyboard hook (`uiohook-napi`), with `globalShortcut` only as a fallback | `RegisterHotKey` never fires while a game reads the keyboard through DirectInput (tested in-game: borderless and elevated made no difference); a `WH_KEYBOARD_LL` hook does, which is how AutoHotkey works inside Skyrim. The hook matches one combination and stores nothing, and the README says so |
| 2026-09-22 | Foreground handling goes through koffi (`user32` calls), not a compiled addon or a helper process | koffi ships prebuilt N-API binaries, so neither the developer nor CI needs a compiler; a PowerShell helper would cost a process and a second of startup. Both native modules are external to the Vite bundle and `npmRebuild` is off, because prebuilt N-API needs no rebuild for Electron |
| 2026-09-22 | The desktop wrapper runs the existing Express server in-process on a random loopback port rather than talking to storage directly | One code path for web and desktop; the renderer stays a plain web page, and the storage module's atomic writes, backups and migrations are exercised identically in both |
| 2026-09-22 | Global captures are routed through the main window's store when a journal is open, with a server-side write only as the fallback | The renderer holds the document and autosaves the whole thing; a server-side write behind its back would be overwritten by the next keystroke |
| 2026-09-22 | The currency name is a per-character profile setting (schema v6), not an app setting | A player with characters on different servers or systems wants each ledger in its own coin; and it keeps the code free of any one game's vocabulary |
| 2026-09-22 | Portraits are stored inline as ≤256px JPEG data URLs, and adding the field bumped the schema to v4 even though the migration is empty | One JSON file per character stays the whole truth (backups, duplicates and exports carry the images for free); the bump keeps the "format changed → version changed" rule honest, so an older build cannot strip portraits by accident |
| 2026-09-22 | The relationship web uses `d3-force` alone, rendering to SVG by hand, with the character pinned at the centre | A full graph library would add hundreds of kB for features the web does not need; SVG keeps nodes clickable and the picture crisp for screenshots. Pinning the character gives every graph the same readable shape |
| 2026-09-22 | Transactions carry `secret` from the start (v3), although the ledger spec did not list it | Hide-secrets mode (Phase 3 item 5) has to blur transactions too; adding the flag now avoids a fourth schema bump one item later |
| 2026-09-22 | A debt goal's progress is the negative sum of its transactions; a save goal's is the plain sum | Repayments are expenses in the ledger. Deriving progress this way keeps the ledger the single source of truth and lets one transaction serve both the balance and the goal |
| 2026-09-22 | Ledger counterparties are picked from People only (not any entry) | The relationship web reads counterparties as edges between people; a place or faction as a counterparty would need a different edge type. Fields can broaden it later without a migration |
| 2026-09-22 | Quick capture is bound to `Ctrl+/` | The obvious candidates collide: Ctrl+J is Downloads in Chrome, Ctrl+Shift+J/C/K open devtools or the console, Ctrl+Space is claimed by IMEs. Nothing in Chrome, Edge or Firefox uses Ctrl+/ |
| 2026-09-22 | Narrow layouts use an icon rail rather than a slide-in drawer | Navigation stays one click away while the game is running; a drawer would cost a click to open and one to close on every switch |
| 2026-09-22 | Links stay as `[[Title]]` text in bodies; nothing is stored beside them, and namesakes are resolved oldest-first | Text survives any edit, export, or hand-editing of the file. A stored id would break the moment the user edits the link in write mode. Oldest-first keeps existing links stable when a new entry borrows a title |
| 2026-09-22 | `[[…]]` is handled as a remark plugin on the syntax tree, not by string replacement before rendering | Code blocks and inline code are left alone for free, and no second markdown grammar has to be maintained |
| 2026-09-22 | Sessions have no `entryIds`; a session references entries only through `[[links]]` in its body | One linking mechanism instead of two. Backlinks already have to be computed from bodies, so a session becomes a backlink source for free, and there is no second list to keep in sync when an entry is renamed or deleted |
| 2026-09-22 | schemaVersion 2 adds `captures` and `sessions` in one purely additive migration | Both Phase 2 features need a new top-level collection; shipping them in one step means one backup, one migration, one thing to verify |
| 2026-09-22 | Run the server with `tsx` in production instead of compiling to `dist/server`; `npm run build` builds the client only | Removes ESM-extension friction on Windows and keeps one source of truth. Startup cost is negligible for a local single-user app, and the Phase 4 Electron build will bundle anyway. `tsx` is therefore a runtime dependency, not a dev one. |
| 2026-09-22 | Hand-rolled client store over `useSyncExternalStore` rather than a state library | ~150 lines, no dependency, and the clone-the-whole-document write model mirrors the save-the-whole-document API |
| 2026-09-22 | Text fields hold a local draft and commit on a pause (`useAutoCommit`) | Typing must not be gated on cloning the document; the alternative was partial-update APIs, which §2 rules out |
| 2026-09-22 | Fonts bundled locally via `@fontsource-variable/*`, not Google Fonts; since Phase 4a only the latin subsets, declared in our own `fonts.css` | The app has to look right with no internet connection. The packages have no per-subset CSS for variable fonts, so a six-rule stylesheet of our own was the only way to stop Cyrillic, Greek and Vietnamese files landing in `dist/` |
| 2026-09-22 | Tags and entry types store a palette **key** (`gold`, `frost`, …), never a hex value | Colours then follow the active theme, so one tag reads correctly in both Dark and Parchment |
| 2026-09-22 | `CharacterSummary` carries `entryCount` beyond the fields listed in §3 | The character-select cards needed something to say besides a name and a date, and it is free to compute while loading each file |
| 2026-09-22 | Unknown top-level keys are merged back over the validated document on read and write | zod strips what it does not know. A file written by a newer build (sessions, ledger…) must survive a round trip through an older one — see §3 "never silently drop unknown fields" |
| 2026-09-22 | Custom entry types have no `singular` field; the client derives it (`lib/words.ts`) | Avoids asking the user a grammar question when creating a section, and avoids a schema field that would need a migration |
| Planning | JSON files, one per character, instead of a database | Small data; human-readable; easy backup; zero setup for users |
| Planning | Full-document saves with debounce | Simpler and safer at this data size |
| Planning | Local Node server now, Electron .exe in Phase 4 | Fast to develop; most Keizaal players won't install Node, so a one-file release is needed for adoption |
| Planning | Everything is an Entry with a Type; users can add types | One flexible model covers people, places, quests, and custom sections |
| Planning | Fictional example character, real data gitignored | Avoids leaking IC secrets / metagaming; protects player privacy |
