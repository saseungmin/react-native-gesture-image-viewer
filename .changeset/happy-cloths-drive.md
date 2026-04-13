---
'react-native-gesture-image-viewer': minor
---

feat(trigger): dismiss to current item thumbnail

Adds an optional `index` prop to `GestureTrigger` to support dismiss animations that return to the currently visible item.

This improves trigger-based gallery flows after swiping, fast swiping, autoplay, and programmatic navigation. If the current trigger cannot be resolved, dismissal falls back to the opening trigger.

Example:

```tsx
<GestureTrigger id="gallery" index={index} onPress={() => openModal(index)}>
  <Pressable>
    <Image source={{ uri }} />
  </Pressable>
</GestureTrigger>
```
