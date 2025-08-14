---
"react-native-gesture-image-viewer": patch
---

refactor!: remove `onIndexChange` prop in favor of state hook

- Remove `onIndexChange` prop from `GestureViewerProps`
- For current index: use `useGestureViewerState` hook
- For index changes: use `useGestureViewerState` with `useEffect`
- Update component implementation to remove prop handling

Example:

```tsx
// Before
<GestureViewer onIndexChange={(index) => console.log(index)} />

// After
const { currentIndex } = useGestureViewerState();

useEffect(() => {
  console.log(currentIndex);
}, [currentIndex]);
```

**❗ BREAKING CHANGE: onIndexChange prop removed. Use useGestureViewerState for current index and useEffect for change detection.**
