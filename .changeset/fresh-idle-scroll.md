---
'react-native-gesture-image-viewer': patch
---

Replace deprecated InteractionManager initial scroll scheduling with a cancellable idle scheduler.

The viewer now uses requestIdleCallback when available and falls back to a cancellable timer so
initialIndex still works on hosts without idle callback support.
