---
'react-native-gesture-image-viewer': patch
---

Replace deprecated InteractionManager initial scroll scheduling with a cancellable idle scheduler.

The viewer now uses React Native's
[requestIdleCallback](https://reactnative.dev/docs/global-requestIdleCallback) when available and
falls back to a cancellable timer so initialIndex still works on hosts without idle callback
support.
