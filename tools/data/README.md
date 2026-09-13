# Data tools

- `import-records-api.ps1 -JsonPath <file>` imports records through a running Lock Release API and verifies the result.
- `node import-records-db.js --json <file> [--db <file>]` imports directly into a SQLite database after creating a backup.

These are maintenance tools only and are not part of normal app startup or updating.
