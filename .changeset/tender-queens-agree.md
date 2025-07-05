---
"react-native-gesture-image-viewer": major
---

refactor: rename GestureImageViewer to GestureViewer for broader use cases

#### Changed
- **BREAKING CHANGE**: Renamed `GestureImageViewer` to `GestureViewer` for broader use cases
- **BREAKING CHANGE**: Renamed `useImageViewerController` hook to `useGestureViewerController`
- **BREAKING CHANGE**: Renamed `renderImage` prop to `renderItem` in `GestureViewer`

#### Migration Guide
```tsx
// Before
import { GestureImageViewer, useImageViewerController } from 'react-native-gesture-image-viewer';

<GestureImageViewer 
  renderImage={(item) => <Image source={item} />}
/>

// After  
import { GestureViewer, useGestureViewerController } from 'react-native-gesture-image-viewer';

<GestureViewer 
  renderItem={(item) => <Image source={item} />}
/>
```
