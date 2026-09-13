# Lock Release / Sault Locks Tracker

Desktop and mobile canal traffic tracker used by the Sault Canada Locks.

## Project layout

- `main.js` - Electron desktop shell, tray, updater, and desktop lifecycle.
- `server.js` - local API, SQLite storage, phone pairing, and static routing.
- `public/` - live desktop web UI served by `server.js`.
- `mobile/public/` - live linked-phone UI/PWA.
- `assets/` - Electron-only app icons.
- `database/` - starter/recovery SQLite database for legacy/source installs.
- `data-backup/` - legacy JSON fallback used only when a database is empty.
- `tools/data/` - manual JSON import utilities.
- `.github/workflows/build-release.yml` - Windows/macOS build and public update release workflow.

## Development

Run `npm install`, then `npm start`.

Writable live data is stored under the Electron user-data folder rather than inside the installed app. Updates replace application files without replacing the live database.

## Releases

Every push to `main` triggers the release workflow. It publishes Windows, universal macOS, and `Lock_Release_Update.zip` assets to `OfficialUnrealNetwork/Locks-Dashboard-Manager-Updates`.

Do not commit generated builds, release archives, logs, or temporary import files.
