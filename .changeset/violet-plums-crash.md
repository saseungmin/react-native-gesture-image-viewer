---
'react-native-gesture-image-viewer': patch
---

fix(android): restore horizontal swipe by scoping native scroll workaround to iOS

Fix an Android regression where horizontal swiping could stop working after the iOS native scroll gesture
workaround was introduced. The workaround is now scoped to iOS scrollables only, while still preserving the iOS dismiss behavior.
