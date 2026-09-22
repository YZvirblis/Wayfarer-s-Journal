# Changelog

All notable changes to Wayfarer's Journal are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-09-22

The first release: a local journal for roleplay characters, as a portable Windows executable or from source.

### Added

- **Characters** — one journal file per character; create, duplicate, delete, load the fictional example (Sivrid Coal-Hand). Portraits for the character and for People.
- **Entries** — People, Places, Factions, Quests (status and progress counter) and Notes, plus custom sections with their own icon, colour and fields (text, choice, number) through a field editor. Search, tag filter, sort, pin, secret flag, keyboard navigation.
- **Links** — `[[Title]]` and `[[Title|Section]]` links with autocomplete, create-from-link, rename-rewrite, and a "Mentioned in" panel with the sentence around every mention.
- **Command palette** — `Ctrl+K`: fuzzy search over everything, create entries, switch characters, run any command.
- **Quick capture and Inbox** — `Ctrl+/` in the journal; captures become entries, are appended to one, or dismissed.
- **Session log** — dated timeline of play sessions, each linkable and optionally secret.
- **Ledger** — running balance, month groups, one-line quick entry with `@person` autocomplete, filters by person, tag and goal, inline editing, *Dealings* on every person.
- **Goals** — save-up and pay-off goals with progress derived from the ledger, remaining, percent, days left and per-week figures, on the Overview and a Goals page.
- **Relationship web** — force-directed graph of People, Factions and Places from links, shared locations and dealings; hover, click, drag, zoom, tag filter, fit to view.
- **Hide secrets** — one toggle blurs every secret with click-to-peek and keeps secrets out of the web, backlinks and the palette.
- **Per-character currency** — defaults to *septims*, editable on the Overview; the ledger and goals use it everywhere.
- **Export and import** — full JSON export/import as a new character (validated, migrated, previewed, never overwriting) and a readable Markdown export.
- **Backups** — twenty rolling backups per character, restorable from the app as a new character or in place.
- **Two themes** — Dark and Parchment. Layouts down to about 600 px wide for use beside a game.
- **Desktop app (Windows)** — a portable `.exe` running the same server in-process on a free loopback port; `data/` beside the exe with a user-data fallback; window state; tray with *Open*, *Quick capture* and *Quit* and a close-to-tray setting; links open in the system browser; original icon.
- **Global quick capture** — `Ctrl+Shift+J` anywhere on the PC (configurable in Preferences, with the registration status shown) opens a small always-on-top capture window that saves to the Inbox and hands focus back.
- **About and Preferences** dialogs; version taken from `package.json` at build time.
- **Release workflow** — GitHub Actions builds the portable exe on `v*` tags and attaches it to a GitHub Release.

### File format

- `schemaVersion` 6. Earlier files (1–5) are migrated on load, with a backup taken first.

[1.0.0]: https://github.com/YZvirblis/Wayfarer-s-Journal/releases/tag/v1.0.0
