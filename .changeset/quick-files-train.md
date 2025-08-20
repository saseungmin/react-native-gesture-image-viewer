---
"react-native-gesture-image-viewer": minor
---

feat: implement trigger-based modal animation system

- Add `GestureTrigger` component for registering trigger elements
- Implement trigger position-based modal open/close animations
- Enable smooth transition from trigger element to full modal view
- add `triggerAnimation` prop for customizable open animation (duration/easing/reduce-motion, with onAnimationComplete)
- add `onDismissStart` callback to signal dismiss gesture start (useful for hiding external UI)
- add `dismiss()` helper to `renderContainer` for programmatic close

Example:

```tsx
import { GestureTrigger, GestureViewer } from 'react-native-gesture-image-viewer';

// Wrap your thumbnail with GestureTrigger
<GestureTrigger id="gallery" onPress={() => openModal(index)}>
  <Pressable>
    <Image source={{ uri }} />
  </Pressable>
</GestureTrigger>

// Configure GestureViewer with matching id
<GestureViewer
  id="gallery"
  data={images}
  renderItem={renderImage}
  onDismiss={() => setVisible(false)}
  onDismissStart={() => setShowUI(false)}
  triggerAnimation={{
    duration: 300,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
    onAnimationComplete: () => console.log('Animation finished!')
  }}
  renderContainer={(children, helpers) => (
    <View style={{ flex: 1 }}>
      {children}
      {showUI && (
        <View style={styles.header}>
          <Button onPress={helpers.dismiss} title="Close" />
        </View>
      )}
    </View>
  )}
/>
```
