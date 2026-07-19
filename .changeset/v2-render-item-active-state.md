---
'react-native-gesture-image-viewer': minor
---

Expose the settled active list item through the third `renderItem` argument.

```tsx
<GestureViewer
  data={mediaItems}
  renderItem={(item, index, { isActive }) => <MediaItem item={item} paused={!isActive} />}
/>
```

`isActive` is `true` for exactly one rendered list cell when data is present. The current item
remains active while a page transition is in progress, and the target becomes active only after the
transition settles. Loop sentinels resolve to the canonical list cell, and existing two-argument
`renderItem` callbacks remain compatible.
