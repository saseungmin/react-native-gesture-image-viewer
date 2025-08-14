---
"react-native-gesture-image-viewer": patch
---

feat!: add `useGestureViewerState` hook and refactor controller

- Add `useGestureViewerState` hook to access `currentIndex` and `totalCount`
- Refactor `useGestureViewerController` to return control methods only
- Rename `GestureViewerControllerState` to `GestureViewerState`
- Update exports and type definitions

BREAKING CHANGE: `useGestureViewerController` no longer returns `currentIndex` and `totalCount`. Use `useGestureViewerState` instead.

Example:

```diff
import {
  GestureViewer,
-  GestureViewerControllerState,
+  GestureViewerState
  useGestureViewerController,
  useGestureViewerEvent,
+  useGestureViewerState,
} from 'react-native-gesture-image-viewer';

const { 
  goToIndex, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom, rotate,
-  currentIndex, totalCount
} = useGestureViewerController();

+ const { currentIndex, totalCount } = useGestureViewerState();
```
