---
"react-native-gesture-image-viewer": patch
---

fix(useGestureViewerController): Prevent tearing and optimize rendering

- Refactors `useGestureViewerController` to use [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
- This change resolves a potential tearing bug that can occur in concurrent mode by ensuring the hook's state is always synchronized with the external store.
- Optimized the update logic to prevent unnecessary re-renders when currentIndex or totalCount remain unchanged, improving performance.
