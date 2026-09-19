---
'react-native-gesture-image-viewer': patch
---

Fix zoom and pan bounds after rotating content. Use rotated content extents for gestures, web double-clicks, and controller zoom, and reconcile existing offsets when rotation changes. Preserve active gesture baselines and validate the latest geometry when overlapping zoom animations complete.
