---
"react-native-gesture-image-viewer": minor
---

feat: implement trigger-based modal animation system

- Add `GestureTrigger` component for registering trigger elements
- Implement trigger position-based modal open/close animations
- Add `GestureViewerRegistry` for managing trigger nodes
- Support customizable animation config (duration, easing, callbacks)
- Enable smooth transition from trigger element to full modal view

Example:

```tsx
import { GestureTrigger, GestureViewer } from 'react-native-gesture-image-viewer';

// Wrap your thumbnail with GestureTrigger
<GestureTrigger id="gallery" onPress={() => openModal(index)}>
  <Pressable style={styles.thumb}>
    <Image source={{ uri }} style={styles.thumbImage} />
  </Pressable>
</GestureTrigger>

// Configure GestureViewer with matching id
<GestureViewer
  id="gallery"
  data={images}
  renderItem={renderImage}
  triggerAnimation={{
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    onAnimationComplete: () => console.log('Animation finished!')
  }}
/>
```
