---
'react-native-gesture-image-viewer': patch
---

fix(web): stabilize paging sync for autoplay, controller, and double-click zoom

Fix several web-specific paging and interaction issues in `GestureViewer`.

This improves loop and autoplay index synchronization on web, keeps controller-driven navigation in sync, restores double-click zoom, and refines web paging behavior so settled pages match the browser's final scroll position more naturally.
