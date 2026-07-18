---
'react-native-gesture-image-viewer': minor
---

Expose the committed active item through the third `renderItem` argument.

```tsx
<GestureViewer
  data={mediaItems}
  renderItem={(item, index, { isActive }) => <MediaItem item={item} paused={!isActive} />}
/>
```

`isActive` is `true` for exactly one mounted virtual slot when data is present, including loop windows that contain duplicate logical indices. The current item remains active while an animated page transition is in progress, and the target becomes active only after the transition commits. Existing two-argument `renderItem` callbacks remain compatible.
