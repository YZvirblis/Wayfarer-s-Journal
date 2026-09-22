# Wayfarer's Journal

A local, open-source journal and character tracker for roleplayers on **Keizaal Online**.

It replaces the pile of text files you keep open while playing — who you met, what you promised, which quest you were halfway through — with something that is actually pleasant to write in and to read back.

Everything lives on your own computer, as plain JSON files you own. No account, no cloud, no telemetry.

> **Status:** early. Phase 1 (the foundation) is built and usable. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what is coming.

---

## What it does today

- **Characters** — keep a separate journal per character; create, duplicate, or delete them.
- **People, Places, Factions, Quests, Notes** — the built-in sections, each with a searchable list and a writing pane.
- **Your own sections** — add *Rumours*, *Deals*, *Recipes*, anything, with its own icon and colour.
- **Tags** — colour-coded, optionally grouped (Hold / Role / Standing). Create them as you write; filter by them from the sidebar.
- **Quests** — status (active, on hold, done, failed) and an optional counter with a progress bar.
- **Pins and secrets** — pin what matters to the top; flag in-character secrets so you can keep them out of screenshots later.
- **Markdown everywhere** — write plainly, read beautifully. Lists, tables, emphasis, quotes.
- **Overview page** — race, age, birthsign, trade, and long-form backstory sections.
- **Two themes** — a dark, firelit one and a warm Parchment one.
- **Autosave** — there are no Save buttons. Every change is written to disk, with the last twenty versions kept as backups.

---

## Running it on Windows

1. Install **Node.js** (the "LTS" version) from <https://nodejs.org/en/download>. This is a one-time thing.
2. Download this repository (green **Code** button → **Download ZIP**) and unzip it somewhere you'll remember.
3. Double-click **`start.bat`**.

The first run installs what it needs and builds the app, which takes a minute or two. After that it starts in a few seconds and opens your browser automatically.

Leave the black window open while you use the journal — closing it closes the journal. **`stop.bat`** closes it too.

> A one-file `.exe` with no Node.js install is planned for Phase 4.

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

---

## Where your data lives

```
data/
  settings.json            theme, last opened character
  characters/<id>.json     one file per character — this is your journal
  backups/<id>/*.json      the last 20 saves, kept automatically
```

`data/` is never committed to git. To back up your journal, copy that folder. To move to another PC, copy it across.

Saves are atomic: the file is written alongside and then swapped in, so a crash mid-write cannot leave you with half a journal.

---

## For developers

```bash
npm install
npm run dev        # API on 127.0.0.1:4777, Vite on 127.0.0.1:4778
npm run build      # build the client into dist/client
npm start          # serve API + built client on 127.0.0.1:4777
npm run typecheck  # strict TypeScript, client and server
```

The server binds to `127.0.0.1` only — it is never reachable from your network.

| Path | What's in it |
| --- | --- |
| `src/shared` | zod schemas — the single source of truth for the file format |
| `src/server` | Express API, atomic storage, backups, schema migrations |
| `src/client` | React + Tailwind UI |
| `examples/` | the fictional example character |
| `docs/` | design document, roadmap, session-by-session progress |

Architecture, data model, and the decision log are in [`docs/DESIGN.md`](docs/DESIGN.md). Contributions are welcome once Phase 1 settles — see the roadmap first.

---

## Privacy and fair play

- Your journal never leaves your machine. There is no network call other than the one between your browser and your own PC.
- The bundled example character, **Sivrid Coal-Hand**, is entirely fictional and written for this project. Please don't add real players' characters, secrets, or private conversations to anything you share publicly.
- Entries can be marked *secret* so you can keep in-character knowledge out of screenshots. A one-click blur mode is planned for Phase 3.

## Licence and disclaimer

MIT — see [`LICENSE`](LICENSE).

Unofficial fan tool. Not affiliated with Bethesda Softworks or the Keizaal Online team. Contains no game assets, logos, or trademarked imagery; the artwork and wording are original to this project.
