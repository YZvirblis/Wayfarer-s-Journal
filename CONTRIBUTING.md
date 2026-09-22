# Contributing to Wayfarer's Journal

Thank you for considering it. This is a small project with a clear shape; a few conventions keep it that way.

## Development setup

You need Node.js 20 or newer and npm (not pnpm or yarn).

```bash
git clone https://github.com/YZvirblis/Wayfarer-s-Journal.git
cd Wayfarer-s-Journal
npm install
npm run dev            # API on 127.0.0.1:4777 and the Vite client on 127.0.0.1:4778, with hot reload
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run typecheck` | strict TypeScript for the client, the server and the Electron main process |
| `npm run build` | production client into `dist/client` |
| `npm start` | serve the API and the built client on `127.0.0.1:4777` |
| `npm run electron:dev` | build everything and open the desktop app |
| `npm run electron:build` | build the Windows zip (the app folder, packed with asar) into `release/` |
| `npm run icon` | regenerate `build/icon.png` and `build/icon.ico` from `assets/icon.svg` |

The layout:

| Path | What's in it |
| --- | --- |
| `src/shared` | zod schemas: the single source of truth for the file format and settings |
| `src/server` | Express API, atomic storage, rolling backups, schema migrations |
| `src/client` | React + Tailwind UI |
| `electron` | the desktop wrapper: main process, preload bridge, server entry |
| `examples/` | the fictional example character |
| `docs/` | design document, roadmap, progress log, screenshots |

Read [`docs/DESIGN.md`](docs/DESIGN.md) before changing anything structural. It explains the architecture, the data model, the visual language, and records every decision that was taken and why.

## Ground rules

- **The server binds to `127.0.0.1` only.** Never widen it.
- **`data/` is never committed.** It is real, private journal content. Do not add real players' characters, screenshots of them, or their names to anything in the repository, including issues.
- **Example content is fictional and original.** The example character, Sivrid Coal-Hand, was written for this project. Keep it that way.
- **No game assets.** No Bethesda or Skyrim logos, textures, fonts or trademarked imagery. The look is original.
- **Nothing game-specific in code or copy.** The app is for roleplay characters in general. Game-flavoured wording belongs in the example character, not in labels or placeholders.
- **Strict TypeScript, no dead code, reasonable dependencies.** The build is code-split on purpose; check the bundle sizes `vite build` prints before adding a library.
- **Any change to the character file format bumps `SCHEMA_VERSION`** in `src/shared/schema.ts` and adds a migration step in `src/server/migrations.ts`. Migrations run in order on load, after a backup. Update the example character's `schemaVersion` too.
- **Windows first, but not Windows only.** Scripts must work in cmd/PowerShell and have a `.sh` equivalent.

## The session docs convention

This repository is developed in sessions, and each session leaves a written trail so the next one (a person, or an AI assistant working with one) can pick up with no other context:

- `docs/PROGRESS.md` — **Current Status**, **Next Up**, and a **Session Log** with an entry per session (what was built, decisions, build/typecheck result, known issues).
- `docs/ROADMAP.md` — phased checklist. Tick what you finish; add what you discover under the right phase.
- `docs/DESIGN.md` — architecture, data model, conventions, and the **Decision Log**. If you deviate from the design (a different library, a schema change, a new pattern), record the decision and the reason.

A pull request that changes behaviour should touch these files as well. It need not be long: a roadmap tick and a sentence in the progress log are often enough.

## Pull requests

- Open an issue first for anything larger than a fix, so the approach can be agreed before the work is done.
- One topic per PR. Small and reviewable beats big and complete.
- `npm run typecheck` and `npm run build` must pass. There is no test suite yet; describe how you verified the change instead (which views, which widths, which theme).
- Keep the UI consistent with what is there: the design tokens in `src/client/styles`, the existing `ui/` components, both themes, and the narrow layouts (about 600 px and 960 px wide) that people use beside a game window.
- Don't commit `data/`, `build/`, `release/` or `dist/`. They are ignored; keep them that way.
- Write the PR description for someone who has not read the code: what changed, why, and how to see it.

## Reporting bugs and suggesting features

Use the issue templates. For bugs, the app version (About dialog), whether you run the desktop app or from source, and the steps to reproduce make all the difference. Never paste your `data/` files or real journal content into an issue; use the example character to reproduce.

## Licence

By contributing you agree that your contributions are licensed under the MIT licence, like the rest of the project.
