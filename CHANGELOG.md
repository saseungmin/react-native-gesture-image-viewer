# react-native-gesture-image-viewer

## 0.3.1

### Patch Changes

- b71007c: fix: resolve state sync issue when modal reopens

  - Fix controller state not updating when modal reopens
  - Implement registry subscription pattern for manager lifecycle
  - Add proper cleanup for manager instances on modal close
  - Ensure external controller syncs with internal viewer state

  Fixes issue where useImageViewerController would lose state when modal closes and reopens due to manager instance deletion

## 0.3.0

### Minor Changes

- 7399cb9: feat(hook): add external controller hook for ImageViewer

  - Add useImageViewerController hook for external control
  - Implement ImageViewerManager with observer pattern
  - Add ImageViewerRegistry for multi-instance management
  - Support programmatic navigation (goToIndex, goToPrevious, goToNext)
  - Enable external state synchronization with internal gestures

## 0.2.0

### Minor Changes

- 5a75405: feat: implement image zoom gestures with pinch, pan, and double-tap

  - Add pinch gesture for zoom in/out with scale limits
  - Add pan gesture for moving zoomed images
  - Add double-tap gesture for zoom toggle
  - Include smooth animations with bezier easing
  - Support conditional gesture enabling

## 0.1.0

### Minor Changes

- e8cbf6c: feat: 🎉 Initial Release react-native-gesture-image-viewer v0.1.0
