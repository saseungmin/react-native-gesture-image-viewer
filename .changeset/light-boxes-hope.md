---
"react-native-gesture-image-viewer": patch
---

refactor!: improve props naming for better developer experience

- Replace ambiguous gesture props with clearer names
- Group dismiss-related options into single object
- Standardize `enable\*` pattern for gesture controls

**❗ BREAKING CHANGE:**

- `enableDismissGesture` → `dismiss.enabled`
- `dismissThreshold` → `dismiss.threshold`
- `resistance` → `dismiss.resistance`
- `animateBackdrop` → `dismiss.fadeBackdrop`
- `useSnap` → `enableSnapMode`
- `enableZoomPanGesture` → `enablePanWhenZoomed`
- `enableZoomGesture` → `enablePinchZoom`
- `enableSwipeGesture` → `enableHorizontalSwipe`

Example:

```tsx
<GestureViewer
  dismiss={{
    enabled: true,
    threshold: 80,
    resistance: 2,
    fadeBackdrop: true,
  }}
  enableSnapMode
  enablePanWhenZoomed
  enablePinchZoom
  enableHorizontalSwipe
/>
```
