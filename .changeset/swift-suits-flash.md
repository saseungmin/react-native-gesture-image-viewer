---
'react-native-gesture-image-viewer': patch
---

Fix pinch zoom drift near image edges for fullscreen contained images.

Pinch zoom now tracks the two-finger midpoint during scaling instead of feeling anchored to one finger or biased toward
the viewer center.

Fixes https://github.com/saseungmin/react-native-gesture-image-viewer/issues/164
