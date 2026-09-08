---
'react-native-gesture-image-viewer': minor
---

Clamp zoom and pan bounds to the rendered content rect for `contain`-fitted items.

When natural dimensions are already available in each item, provide a stable
`getItemDimensions` resolver:

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

When dimensions are only known after loading, report them through the third `renderItem`
argument:

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

If object items are recreated at the same index while their content remains the same, provide
`getItemKey` to retain their loaded dimensions safely. The key must be unique, must change when the
rendered source or its natural dimensions can change, and must not be the index alone:

```tsx
<GestureViewer
  data={images}
  getItemKey={(item) => item.uri}
  renderItem={(item, _index, { setItemDimensions }) => (
    <Image
      source={{ uri: item.uri }}
      onLoad={({ nativeEvent: { source } }) => {
        setItemDimensions({ width: source.width, height: source.height });
      }}
    />
  )}
/>
```

Without `getItemKey`, loaded dimensions are reused only while the exact item instance remains at
that index. Replaced or reordered items use the viewer-cell fallback until their current dimensions
become available, preventing stale bounds from a previous item.

On each axis, scaled content stays centered while it is smaller than the viewport and stops when
its rendered edge reaches the viewport edge once it becomes larger. The same bounds apply to
pinch, pan, double-tap, web, and controller zoom paths.

Fixes [#191](https://github.com/saseungmin/react-native-gesture-image-viewer/issues/191).
