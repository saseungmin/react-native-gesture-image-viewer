---
"react-native-gesture-image-viewer": minor
---

feat: add programmatic zoom controls

- Add `zoomIn(multiplier)`, `zoomOut(multiplier)`, `resetZoom(scale)` methods to `GestureViewerManager`
- Expose zoom controls through `useGestureViewerController` hook
- Support multiplier validation (0.01-1 range) with JSDoc comments
- Add comprehensive usage examples and API reference

### Usage
```tsx
const { zoomIn, zoomOut, resetZoom } = useGestureViewerController();

<Button onPress={() => zoomIn(0.25)} />
<Button onPress={() => zoomOut(0.25)} />
<Button onPress={() => resetZoom()} />
```
