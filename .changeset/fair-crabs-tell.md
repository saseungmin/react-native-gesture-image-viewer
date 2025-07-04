---
"react-native-gesture-image-viewer": patch
---

feat: add TypeScript type inference for ListComponent props

The `listProps` provides **type inference based on the selected list component**, ensuring accurate autocompletion and type safety in your IDE.

```tsx
import { FlashList } from '@shopify/flash-list';

function App() {
  return (
    <GestureImageViewer
      data={images}
      ListComponent={FlashList}
      listProps={{
        // ✅ FlashList props autocompletion
      }}
    />
  );
}
```
