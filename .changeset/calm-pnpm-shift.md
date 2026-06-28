---
'react-native-gesture-image-viewer': patch
---

Migrate the repository release and documentation workflow from Yarn to pnpm.

This keeps the published library API unchanged for app users, while contributors and release automation now install, build, test, and publish from the pnpm lockfile and workspace setup.
