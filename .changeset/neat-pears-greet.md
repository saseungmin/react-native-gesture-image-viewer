---
"react-native-gesture-image-viewer": patch
---

fix: resolve zoom gesture conflicts and coordinate issues

- Fix pinch zoom out moving to bottom-right and reset x,y coordinates to 0 when scale below 1
- Fix pinch zoom in conflicts with zoomPanGesture preventing normal zoom operation
- Fix vertical dismiss gesture conflicts with zoomPanGesture
- Fix backdrop opacity not changing when moving down (negative y) when scale is 1 or below
- Add constrainToBounds function to unify boundary constraint logic
- Fix position jumping on pinch gesture end with smooth stabilization
