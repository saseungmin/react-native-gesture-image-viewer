# react-native-gesture-image-viewer

## 0.5.4

### Patch Changes

- be6a46f: docs(readme): add example.gif in example section

## 0.5.3

### Patch Changes

- 0c4126f: fix(web): resolve FlashList visibility issue due to missing height style

## 0.5.2

### Patch Changes

- c4934c6: chore: exclude src files from npm package

## 0.5.1

### Patch Changes

- 8eec052: feat: add TypeScript type inference for ListComponent props

  The `listProps` provides **type inference based on the selected list component**, ensuring accurate autocompletion and type safety in your IDE.

  ```tsx
  import { FlashList } from "@shopify/flash-list";

  function App() {
    return (
      <GestureImageViewer
        data={images}
        ListComponent={FlashList}
        listProps={
          {
            // ✅ FlashList props autocompletion
          }
        }
      />
    );
  }
  ```

## 0.5.0

### Minor Changes

- 603d0bd: feat: add support for using ScrollView as a list component

## 0.4.0

### Minor Changes

- b7d85b6: feat: replace pagingEnabled with snapToInterval and add itemSpacing prop

  - Replace pagingEnabled with snapToInterval for better control
  - Add itemSpacing prop to customize spacing between items
  - Improve paging flexibility and user experience

## 0.3.2

### Patch Changes

- 5f251a5: docs: initial documentation for React Native Gesture Image Viewer

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
