---
'react-native-gesture-image-viewer': minor
---

feat: add cross-platform single tap support for `GestureViewer`

This release adds `onSingleTap` to `GestureViewer` so you can handle confirmed single taps without overlaying an extra pressable on top of the viewer.

```tsx
<GestureViewer
  data={images}
  renderItem={renderImage}
  onSingleTap={() => setShowControls((prev) => !prev)}
/>
```

It also adds a `tap` event to `useGestureViewerEvent`, currently emitting confirmed single taps with `{ kind: 'single', x, y, index }`.

```tsx
useGestureViewerEvent('tap', (event) => {
  if (event.kind === 'single') {
    console.log(`Tapped item ${event.index} at (${event.x}, ${event.y})`);
  }
});
```

This improves common viewer UI patterns such as toggling headers, toolbars, counters, or captions on tap while preserving swipe, pinch, dismiss, and double-tap zoom behavior.

Related discussion: https://github.com/saseungmin/react-native-gesture-image-viewer/discussions/157
