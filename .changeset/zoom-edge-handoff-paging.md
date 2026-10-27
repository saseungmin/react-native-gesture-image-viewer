---
'react-native-gesture-image-viewer': minor
---

Add opt-in `edgeHandoffPaging` to let a zoomed pan continue into paging once the image reaches its edge, as in the iOS Photos app.

```tsx
// Enable with defaults
<GestureViewer data={images} renderItem={renderImage} edgeHandoffPaging />

// Wait for 40pt of drag past the edge before the page follows
<GestureViewer
  data={images}
  renderItem={renderImage}
  edgeHandoffPaging={{ enabled: true, threshold: 40 }}
/>
```

Disabled by default. The drag past the edge moves the page, the existing `horizontalSwipe` thresholds decide the release, and the incoming image arrives at its fitted scale.
