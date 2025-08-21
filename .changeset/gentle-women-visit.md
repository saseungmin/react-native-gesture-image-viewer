---
"react-native-gesture-image-viewer": patch
---

fix: sync `dataRef` on data change; use `manager.currentIndex` for comparison

- move `dataRef.current` update into `useEffect([data])` to sync only when data changes
- compare against `manager.getState().currentIndex` for accurate index checks
