---
"react-native-gesture-image-viewer": minor
---

feat: add loop mode for GestureViewer
- Add `enableLoop` prop for seamless boundary crossing
- Implement `goToNext`/`goToPrevious` with loop animation
- Support both FlatList, FlashList and ScrollView components

Example usage:

```tsx
// New prop
<GestureViewer
  enableLoop={true}  // Enable loop mode
  data={images}
  renderItem={renderItem}
/>

// Enhanced controller methods
const { goToNext, goToPrevious } = useGestureViewerController();
// Now supports loop transitions when enableLoop is true
```
