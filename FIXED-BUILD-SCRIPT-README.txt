This source package fixes the GitHub Actions failure:
"Invalid processed options" during electron-packager.

The fix is in package.json:
- removed --asar=false
- changed --prune=true to --prune
- made ignore rules proper regex strings

Upload/overwrite these files in the PRIVATE source repo, then rerun Actions.
