---
'react-native-gesture-image-viewer': major
---

Prepare the v3 beta by replacing consumer-supplied list paging with an internal gesture-driven render window.

`GestureViewer` no longer depends on a consumer-provided `ScrollView`, `FlatList`, or `FlashList` to move between items. Instead, v3 owns paging internally with Reanimated shared values and a small render window around the current item.

By default, the viewer mounts three render-window slots: previous, current, and next. When the user swipes, or when app code calls `goToIndex`, `goToNext`, or `goToPrevious`, the viewer moves the visual page first, then rebases the internal center virtual index and recalculates the mounted slots.

Breaking changes:

- Removed `ListComponent`.
- Removed `listProps`.
- Removed `enableSnapMode`.
- Removed `itemSpacing`; use `pageSpacing` instead.
- Paging props that previously belonged to `FlatList`, `FlashList`, or `ScrollView` are no longer forwarded.

New and updated APIs:

- Added `windowSize` to control how many internal render-window slots are mounted. The value is normalized to an odd number of at least `3`.
- Added `pageSpacing` to render visible horizontal space between pages.
- Updated `goToIndex` to accept `goToIndex(index, { animated?: boolean })`.
- Kept `enableHorizontalSwipe` scoped to user gestures only. Programmatic navigation through the controller still works when horizontal swipe gestures are disabled.

Migration example:

```tsx
// v2
<GestureViewer
  data={images}
  renderItem={renderImage}
  ListComponent={FlatList}
  listProps={{
    keyExtractor: (item) => item.id,
    initialScrollIndex: 2,
    showsHorizontalScrollIndicator: false,
  }}
  enableSnapMode
  itemSpacing={16}
/>
```

```tsx
// v3
<GestureViewer
  data={images}
  renderItem={renderImage}
  initialIndex={2}
  pageSpacing={16}
  windowSize={3}
/>
```

Programmatic navigation example:

```tsx
const controller = useGestureViewerController();

controller.goToIndex(2);
controller.goToIndex(2, { animated: false });
controller.goToNext();
controller.goToPrevious();
```

Gesture lock example:

```tsx
function Viewer() {
  const controller = useGestureViewerController();

  return (
    <>
      <Button title="Next" onPress={() => controller.goToNext()} />
      <GestureViewer data={images} renderItem={renderImage} enableHorizontalSwipe={false} />
    </>
  );
}
```

In the example above, users cannot swipe horizontally, but the button can still move the viewer because gesture locking and controller navigation are intentionally separated.

Common `listProps` replacements:

| v2 list prop or pattern                                  | v3 replacement                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `initialScrollIndex`                                     | `initialIndex`                                                                          |
| `keyExtractor`                                           | Removed. Render-window slots are keyed internally. Keep item identity stable in `data`. |
| `scrollToIndex(...)` through a list ref                  | `useGestureViewerController().goToIndex(...)`                                           |
| `snapToInterval`, `pagingEnabled`, `decelerationRate`    | Removed. Paging is gesture-owned.                                                       |
| `itemSpacing`                                            | `pageSpacing`                                                                           |
| `windowSize`, `maxToRenderPerBatch`, `estimatedItemSize` | `windowSize` on `GestureViewer`                                                         |
