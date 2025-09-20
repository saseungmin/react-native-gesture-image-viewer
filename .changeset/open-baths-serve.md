---
"react-native-gesture-image-viewer": patch
---

fix: improve type inference for listProps with generic list components

- Add InstantiateGeneric helper type for better generic component props inference
- Change generic type parameter from T to ItemT for clarity
- Fix type inference issues with FlashList, FlatList keyExtractor and renderItem props
- Ensure all list component props receive correct ItemT type instead of unknown

**Before:**

```tsx
<GestureViewer
  data={images}
  renderItem={renderImage}
  ListComponent={FlashList}
  // keyExtractor's item parameter was unknown type
  listProps={{
    keyExtractor: (item, index) => item.id, // ❌ item is unknown
  }}
/>
```

**After:**

```tsx
<GestureViewer
  data={images}
  renderItem={renderImage}
  ListComponent={FlashList}
  // keyExtractor's item parameter is now properly typed
  listProps={{
    keyExtractor: (item, index) => item.id, // ✅ item has correct type
    // and other props...
  }}
/>
```
