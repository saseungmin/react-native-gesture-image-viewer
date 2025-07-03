---
"react-native-gesture-image-viewer": minor
---

feat(hook): add external controller hook for ImageViewer

- Add useImageViewerController hook for external control
- Implement ImageViewerManager with observer pattern
- Add ImageViewerRegistry for multi-instance management
- Support programmatic navigation (goToIndex, goToPrevious, goToNext)
- Enable external state synchronization with internal gestures
