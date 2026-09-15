<p align="center">
  <img src="https://i.imgur.com/i1TX5XR.png" alt="Sault Locks Tracker" width="100%">
</p>

# Lock Release / Sault Locks Tracker

Desktop and mobile canal traffic tracking software used by the **Sault Canada Locks**.

The project includes the desktop application, linked mobile interface, local API, database storage, automatic updates, and release tooling.

## Project Structure

* `main.js` — Electron desktop shell, system tray, updater, and application lifecycle.
* `server.js` — Local API, SQLite storage, phone pairing, and static file routing.
* `public/` — Desktop web interface served by `server.js`.
* `mobile/public/` — Linked-phone interface and PWA.
* `assets/` — Electron application icons and desktop assets.
* `database/` — Starter and recovery SQLite database for source or legacy installs.
* `data-backup/` — Legacy JSON fallback used when the database is empty.
* `tools/data/` — Manual JSON import and data utilities.
* `.github/workflows/build-release.yml` — Windows and macOS build and release workflow.

## Development

Install dependencies and start the application:

```bash
npm install
npm start
```

Live writable data is stored in the Electron user-data directory instead of inside the installed application.

This allows application updates to replace program files without overwriting the active database or user data.

## Releases

Every push to `main` triggers the automated build and release workflow.

Automatic update packages are published to:

**Sault-Ste-Marie-Locks/Sault-Locks-Tracker-Updates**

Public Windows and macOS downloads are published to:

**Sault-Ste-Marie-Locks/Sault-Locks-Tracker-Releases**

## Repository Notes

Generated builds, release archives, logs, temporary files, and manual import files should not be committed to this repository.
