---
"react-native-gesture-image-viewer": patch
---

fix: resolve state sync issue when modal reopens

- Fix controller state not updating when modal reopens
- Implement registry subscription pattern for manager lifecycle
- Add proper cleanup for manager instances on modal close
- Ensure external controller syncs with internal viewer state

Fixes issue where useImageViewerController would lose state when modal closes and reopens due to manager instance deletion
