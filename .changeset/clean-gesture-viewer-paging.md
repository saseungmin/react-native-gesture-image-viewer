---
'react-native-gesture-image-viewer': patch
---

Refactor the gesture viewer's internal paging responsibilities into focused hooks without changing the public API.

Paging shared values, transition commands, horizontal gestures, and manager bridge effects now have dedicated ownership. This keeps `useGestureViewer` focused on navigation policy and reduces the risk of inconsistent paging state during future changes.
