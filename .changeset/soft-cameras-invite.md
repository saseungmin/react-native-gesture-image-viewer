---
'react-native-gesture-image-viewer': minor
---

feat: add configurable dismiss swipe directions

- `GestureViewer` now supports `dismiss.direction` with `down`, `up`, and `both`.
- The default remains `down` for backward compatibility, and backdrop fading now follows the configured dismiss direction.

Example:

```tsx
<GestureViewer
  data={images}
  renderItem={renderImage}
  dismiss={{
    direction: 'both',
    threshold: 100,
  }}
/>
```
