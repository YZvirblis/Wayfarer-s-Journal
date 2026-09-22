# CLAUDE.md — Wayfarer's Journal

Claude Code loads this file automatically at the start of every session. It defines how to work on this project.

## What this project is
Wayfarer's Journal is a local, open-source journal and character tracker for players of **Keizaal Online** (a Skyrim roleplay multiplayer server). It runs on the player's own PC, stores data as JSON files, and is published publicly on GitHub for the community.

Full details live in `docs/`:
- `docs/DESIGN.md` — vision, architecture, data model, visual design, decision log
- `docs/ROADMAP.md` — phased plan with checkboxes
- `docs/PROGRESS.md` — current status, next steps, and a log of every session

## Session protocol (mandatory)

### At the start of every session
1. Read `docs/PROGRESS.md` first. It tells you where the last session left off.
2. Read `docs/ROADMAP.md` and `docs/DESIGN.md`.
3. Run `git status` and `git log --oneline -15` to confirm the repo matches what PROGRESS.md claims. If they disagree, tell the user before doing anything else.
4. Before writing code, briefly state: the current phase, what was done last session, and what you plan to do now.

### During the session
- Follow `docs/DESIGN.md`. If you need to deviate (different library, data model change, new pattern), do it only for a good reason and record it in the Decision Log in DESIGN.md.
- Any change to the character file format must bump `schemaVersion` and include a migration.
- Keep the app runnable. Do not end a session with a broken build.

### At the end of every session
1. Update `docs/PROGRESS.md`:
   - Rewrite **Current Status** and **Next Up** so a fresh session can continue with no other context.
   - Add a new entry at the top of the **Session Log** using the template in that file.
2. Tick completed items in `docs/ROADMAP.md`, and add newly discovered tasks under the right phase.
3. Update `docs/DESIGN.md` if architecture, data model, or conventions changed (including the Decision Log).
4. Run the build and type check. Record the result in the session log entry.
5. Commit locally with a descriptive message. **Never push** — the user pushes.
6. End with the report format below.

## Report format (end of every session)
1. Summary of what was built or changed
2. File tree of changed areas (top 3 levels)
3. Decisions or deviations from the docs, and why
4. Known issues / TODOs
5. Exact steps to run it
6. Suggested next steps

## Hard rules
- The server binds to `127.0.0.1` only.
- `data/` is gitignored and never committed. Never commit real player data.
- Example/demo content must be **original and fictional**. Never use real players' characters.
- No Bethesda or Skyrim logos, game assets, or trademarked imagery. The aesthetic is original.
- Use npm (not pnpm/yarn). Strict TypeScript. No dead code. Keep dependencies reasonable.
- The environment is Windows (project root: `D:\Wayfarer-s-Journal`). Scripts must work in cmd/PowerShell; provide `.sh` equivalents too.
