---
'react-native-gesture-image-viewer': minor
---

Clamp zoom and pan bounds to the rendered content rect for `contain`-fitted items. Content
smaller than the viewport stays centered, while larger content stops when its edge reaches the
viewport edge.

When natural dimensions are already available, provide them through `getItemDimensions`:

```tsx
type ImageItem = {
  uri: string;
  width: number;
  height: number;
};

const getImageDimensions = (item: ImageItem) => ({
  width: item.width,
  height: item.height,
});

<GestureViewer
  data={images}
  ListComponent={FlatList}
  getItemDimensions={getImageDimensions}
  renderItem={(item) => (
    <Image source={{ uri: item.uri }} style={styles.image} resizeMode="contain" />
  )}
/>;
```

When dimensions are only known after loading, report them through `setItemDimensions` in the third
`renderItem` argument:

```tsx
<GestureViewer
  data={images}
  ListComponent={FlatList}
  renderItem={(item, _index, { setItemDimensions }) => (
    <Image
      source={{ uri: item.uri }}
      style={styles.image}
      resizeMode="contain"
      onLoad={({ nativeEvent: { source } }) => {
        setItemDimensions({ width: source.width, height: source.height });
      }}
    />
  )}
/>
```

Runtime dimensions reported with `setItemDimensions` take precedence over
`getItemDimensions`. Invalid or unavailable dimensions keep the existing viewer-cell fallback, so
both APIs are optional and existing arbitrary-content renderers remain compatible.

If equivalent object items are recreated, provide a stable content key to retain their loaded
dimensions:

```tsx
getItemKey={(item) => item.uri}
```

The same bounds apply to pinch, pan, double-tap, web, and controller zoom paths.

Fixes [#191](https://github.com/saseungmin/react-native-gesture-image-viewer/issues/191).
