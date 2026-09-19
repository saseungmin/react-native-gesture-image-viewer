---
'react-native-gesture-image-viewer': minor
---

Add opt-in `panInertia` for zoomed images. After a pan is released, the image continues moving with the release velocity and gradually slows down within its content bounds.

Enable inertia with the default settings:

```tsx
<GestureViewer data={images} renderItem={renderImage} panInertia />
```

To customize how quickly the image slows down, pass a configuration object with an explicit `enabled` field:

```tsx
<GestureViewer
  data={images}
  renderItem={renderImage}
  panInertia={{
    enabled: true,
    deceleration: 0.995,
  }}
/>
```

`panInertia` defaults to `false`, preserving existing behavior when omitted. Pass `false` or `{ enabled: false }` to disable it. Configuration objects require `enabled`; an empty object does not enable inertia. `enablePanWhenZoomed` must also be enabled.

`deceleration` defaults to `0.998`. Values closer to `1` glide longer; lower values stop sooner. Finite values strictly between `0` and `1` are accepted, and invalid values fall back to the default.

Inertia respects the system reduced-motion setting and stops when a new interaction takes over. It uses the fitted content bounds when dimensions are provided through `getItemDimensions` or `setItemDimensions`, otherwise falling back to the viewer dimensions. Rubber-banding and edge-handoff paging are not included.
