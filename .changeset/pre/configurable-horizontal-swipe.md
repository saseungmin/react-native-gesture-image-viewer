---
'react-native-gesture-image-viewer': major
---

Replace the boolean `enableHorizontalSwipe` prop with configurable `horizontalSwipe` options.

This is a breaking API change. Migrate gesture disabling from the removed boolean prop:

```tsx
// Before
<GestureViewer
  data={images}
  renderItem={renderImage}
  enableHorizontalSwipe={false}
/>

// After
<GestureViewer
  data={images}
  renderItem={renderImage}
  horizontalSwipe={{ enabled: false }}
/>
```

The new options also allow applications to control the distance and velocity required to change pages:

```tsx
<GestureViewer
  data={images}
  renderItem={renderImage}
  horizontalSwipe={{
    enabled: true,
    distanceThresholdRatio: 0.4,
    velocityThreshold: 1200,
  }}
/>
```

All fields are optional. `enabled` defaults to `true`, `distanceThresholdRatio` defaults to `0.25` of the viewer width, and `velocityThreshold` defaults to `800` points per second.

A page transition is committed when either the absolute drag distance is strictly greater than the configured width ratio or the absolute velocity is strictly greater than the configured velocity threshold. Finite non-negative values, including `0` and distance ratios greater than `1`, are supported. Invalid values fall back to their defaults.

Setting `horizontalSwipe.enabled` to `false` disables only touch and mouse horizontal gestures. Controller navigation and autoplay continue to work.
