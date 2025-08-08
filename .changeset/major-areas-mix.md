---
"react-native-gesture-image-viewer": patch
---

fix: prevent multiple `onIndexChange` calls during initialization

- Remove redundant currentIndex state to avoid duplicate callbacks
- Use manager subscription as single source of truth for index changes
- Implement ref pattern for `onIndexChange` to prevent stale closures
- Ensure `onIndexChange` only fires on actual user interactions, not internal state changes

Now `onIndexChange` correctly fires only once during initialization.

Fixes #67
