---
'react-native-gesture-image-viewer': minor
---

Add opt-in `panInertia` to let zoomed images glide and gradually stop after a drag.

```tsx
// Enable with defaults
<GestureViewer data={images} renderItem={renderImage} panInertia />

// Customize deceleration
<GestureViewer
  data={images}
  renderItem={renderImage}
  panInertia={{ enabled: true, deceleration: 0.995 }}
/>
```

Disabled by default. Deceleration defaults to `0.998`. Inertia stops at content bounds and is interrupted by new gestures.
