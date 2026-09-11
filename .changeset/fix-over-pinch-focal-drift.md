---
'react-native-gesture-image-viewer': patch
---

Fix focal-point drift when a pinch settles back to `maxZoomScale`, while respecting
the rendered content bounds. Keep scale and translation animations synchronized
throughout the return.
