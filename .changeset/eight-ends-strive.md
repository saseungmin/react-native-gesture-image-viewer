---
"react-native-gesture-image-viewer": patch
---

fix: prevent unintended horizontal scroll during pinch zoom

Fixed unintended horizontal scroll when starting pinch zoom gesture.

Previously, when initiating a pinch zoom with two fingers, the first finger touch could trigger horizontal scrolling before the second finger was detected. This caused unwanted page transitions while trying to zoom.
