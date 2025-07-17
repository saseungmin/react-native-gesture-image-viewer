# react-native-gesture-image-viewer

## 1.4.1

### Patch Changes

- dc9270f: feat: add GestureViewerController types and enhance TSDoc documentation

  - Add GestureViewerController type definition
  - Mark state properties as readonly for immutability
  - Enhance TSDoc with comprehensive parameter descriptions and examples
  - Improve useGestureViewerController hook docs for destructuring usage

## 1.4.0

### Minor Changes

- 9baa0b7: feat: add programmatic rotation controls

  - Add `rotate(angle, clockwise)` method to GestureViewerManager
  - Support angle values: `0`, `90`, `180`, `270`, `360` degrees
  - Support clockwise/counter-clockwise rotation direction
  - Add `angle=0` for rotation reset functionality
  - Expose rotate method in useGestureViewerController hook
  - Add comprehensive JSDoc with usage examples
  - Update Korean and English documentation
  - Add rotation control examples with Feather icons

  Example usage:

  ```tsx
  const { rotate } = useGestureViewerController();
  <Button onPress={() => rotate(90)} /> // 90° clockwise
  <Button onPress={() => rotate(90, false)} /> // 90° counter-clockwise
  <Button onPress={() => rotate(0)} /> // reset rotation
  ```

## 1.3.0

### Minor Changes

- 0d7c364: feat: add programmatic zoom controls

  - Add `zoomIn(multiplier)`, `zoomOut(multiplier)`, `resetZoom(scale)` methods to `GestureViewerManager`
  - Expose zoom controls through `useGestureViewerController` hook
  - Support multiplier validation (0.01-1 range) with JSDoc comments
  - Add comprehensive usage examples and API reference

  ### Usage

  ```tsx
  const { zoomIn, zoomOut, resetZoom } = useGestureViewerController();

  <Button onPress={() => zoomIn(0.25)} />
  <Button onPress={() => zoomOut(0.25)} />
  <Button onPress={() => resetZoom()} />
  ```

## 1.2.3

### Patch Changes

- 2ddbf5b: docs(readme): fix typo `renderImage` to `renderItem` props
- c56b740: chore: include src folder in package.json files

  - Add src to files array for better debugging experience
  - Enables accurate source maps and stack traces for library users
  - Follows React Native library best practices

## 1.2.2

### Patch Changes

- 2f0eac2: feat: add grabbing cursor for web drag gestures

  - Apply grabbing cursor to `dismissGesture` and `zoomPanGesture`
  - Improve web UX with visual drag feedback

## 1.2.1

### Patch Changes

- 9eb8d46: fix: resolve zoom gesture conflicts and coordinate issues

  - Fix pinch zoom out moving to bottom-right and reset x,y coordinates to 0 when scale below 1
  - Fix pinch zoom in conflicts with zoomPanGesture preventing normal zoom operation
  - Fix vertical dismiss gesture conflicts with zoomPanGesture
  - Fix backdrop opacity not changing when moving down (negative y) when scale is 1 or below
  - Add constrainToBounds function to unify boundary constraint logic
  - Fix position jumping on pinch gesture end with smooth stabilization

## 1.2.0

### Minor Changes

- 4ca4f09: feat: improve zoom gestures with focal point and boundary constraints

  #### ✨ Features

  - **Gesture Viewer**: Enhanced zoom gestures with focal point support
    - Pinch zoom now centers on the focal point between two fingers
    - Double-tap zoom centers on the tapped location
    - Added boundary constraints to prevent images from moving outside screen bounds

  #### 🔧 Improvements

  - **Performance**: Removed unnecessary `worklet` declarations and optimized gesture handling

## 1.1.0

### Minor Changes

- 27f895c: feat: add useSnap mode with paging as default

  - Add useSnap boolean prop to toggle between paging and snap modes
  - Add itemSpacing prop for spacing control in snap mode
  - Set paging mode as default behavior (useSnap: false)
  - Add comprehensive TypeScript documentation

## 1.0.1

### Patch Changes

- 60c6e7f: docs: add comprehensive TSDoc comments to GestureViewerProps interface

  - Add detailed descriptions for all props with usage examples
  - Include default values and parameter information
  - Improve developer experience with better IDE autocompletion

## 1.0.0

### Major Changes

- 687ac58: refactor: rename GestureImageViewer to GestureViewer for broader use cases

  #### Changed

  - **BREAKING CHANGE**: Renamed `GestureImageViewer` to `GestureViewer` for broader use cases
  - **BREAKING CHANGE**: Renamed `useImageViewerController` hook to `useGestureViewerController`
  - **BREAKING CHANGE**: Renamed `renderImage` prop to `renderItem` in `GestureViewer`

  #### Migration Guide

  ```tsx
  // Before
  import {
    GestureImageViewer,
    useImageViewerController,
  } from "react-native-gesture-image-viewer";

  <GestureImageViewer renderImage={(item) => <Image source={item} />} />;

  // After
  import {
    GestureViewer,
    useGestureViewerController,
  } from "react-native-gesture-image-viewer";

  <GestureViewer renderItem={(item) => <Image source={item} />} />;
  ```

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
