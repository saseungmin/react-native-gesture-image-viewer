---
"react-native-gesture-image-viewer": minor
---

feat: add programmatic rotation controls

- Add `rotate(angle, clockwise)` method to GestureViewerManager
- Support angle values: `0`, `90`, `180`, `270`, `360` degrees
- Support clockwise/counter-clockwise rotation direction
- Add `angle=0` for rotation reset functionality
- Expose rotate method in useGestureViewerController hook
- Add comprehensive JSDoc with usage examples
- Update Korean and English documentation
- Add rotation control examples with Feather icons

Example usage:

```tsx
const { rotate } = useGestureViewerController();
<Button onPress={() => rotate(90)} /> // 90° clockwise
<Button onPress={() => rotate(90, false)} /> // 90° counter-clockwise
<Button onPress={() => rotate(0)} /> // reset rotation
```
