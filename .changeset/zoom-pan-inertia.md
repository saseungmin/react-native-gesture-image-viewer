---
'react-native-gesture-image-viewer': minor
---

Add opt-in `panInertia` to let zoomed images glide and gradually stop after a drag.

```tsx
// Enable with defaults
<GestureViewer data={images} renderItem={renderImage} panInertia />

// Customize the motion
<GestureViewer
  data={images}
  renderItem={renderImage}
  panInertia={{ enabled: true, deceleration: 0.9998, velocityFactor: 1, rubberBandEffect: true, rubberBandFactor: 3 }}
/>
```

Disabled by default. When enabled, it uses a longer glide with edge rubber-banding. Customize the decay, velocity multiplier, and edge response as needed.
