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

On each axis, scaled content stays centered while it is smaller than the viewport and stops when
its rendered edge reaches the viewport edge once it becomes larger. The same bounds apply to
pinch, pan, double-tap, web, and controller zoom paths.

Runtime registrations are bound to logical item identity while v3 render-window slots are reused. If the same logical item can be recreated as a new object in the same slot, add `getItemKey(item, index)` alongside `setItemDimensions` so the runtime dimensions stay attached to that slot. The key must identify the same rendered content and change when the rendered source or natural dimensions change; do not use the array index alone.

```tsx
<GestureViewer
  data={images}
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
  getItemKey={(item) => item.uri}
/>
```

Fixes [#191](https://github.com/saseungmin/react-native-gesture-image-viewer/issues/191).
