UPLOAD THIS FOLDER'S CONTENTS TO THE PRIVATE SOURCE REPO

Private source repo:
OfficialUnrealNetwork/Locks-Dashboard-Manager

Public update repo used by the app:
OfficialUnrealNetwork/Locks-Dashboard-Manager-Updates

What to upload:
Upload the CONTENTS of this folder, not the folder itself.
Your private repo should directly show files like:
- package.json
- main.js
- server.js
- index.html
- update-config.json
- .github/workflows/build-release.yml
- assets/
- mobile/
- database/

Do NOT upload generated files/folders like:
- node_modules/
- dist/
- out/
- .exe files
- .zip files

After upload:
1. In the private repo, create a GitHub Actions secret named UPDATE_REPO_TOKEN.
2. The token needs Contents: Read and Write access to OfficialUnrealNetwork/Locks-Dashboard-Manager-Updates.
3. Go to Actions in the private repo and run "Build Lock Release Windows Update".
4. The finished update release will appear in the public updates repo.
