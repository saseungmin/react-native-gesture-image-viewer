---
"react-native-gesture-image-viewer": minor
---

feat: add auto-play functionality to gesture viewer with configurable interval

- add `autoPlay` and `autoPlayInterval` props
- when `autoPlay` is enabled, the viewer will automatically play the next item after the specified interval
- when `enableLoop` is enabled, the viewer will loop back to the first item after the last item
- when `enableLoop` is disabled, the viewer will stop at the last item
- `autoPlayInterval` is optional and defaults to 3000ms
- `autoPlay` is optional and defaults to `false`

```tsx
import { GestureViewer } from 'react-native-gesture-image-viewer';

function App() {
  return (
    <GestureViewer
      autoPlay
      autoPlayInterval={3000}
    />
  );
}
```
