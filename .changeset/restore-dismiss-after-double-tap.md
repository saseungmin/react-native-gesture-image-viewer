---
'react-native-gesture-image-viewer': patch
---

Fix swiping to dismiss immediately after double-tap zoom-out. New touches finish the pending zoom-out and reach the correct gesture, with pan inertia enabled or disabled.
