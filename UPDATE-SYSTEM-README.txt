Lock Release Private GitHub Updates

Repo:
jacpelletie07/Locks-Dashboard-Manager

This app checks GitHub Releases on startup.
For a private repo, the installed PC must have a token saved locally.

Token options:
1. Environment variable:
   LOCK_RELEASE_GITHUB_TOKEN

2. Token file:
   %APPDATA%\Lock Release\github-token.txt

Do not commit your token to GitHub.

Release asset name expected by the app:
Lock_Release_Windows.zip

GitHub Actions:
The included workflow builds the Windows app and creates that zip automatically.
