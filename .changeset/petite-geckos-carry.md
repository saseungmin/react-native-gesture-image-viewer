---
'react-native-gesture-image-viewer': patch
---

chore: support React Compiler-safe shared value access

Align internal Reanimated shared value access with React Compiler guidance by using `get()` and `set()` instead of direct `.value` reads and writes. Public APIs are unchanged.

- <https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/#react-compiler-support>
