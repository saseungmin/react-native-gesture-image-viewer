# react-native-gesture-image-viewer

## 2.0.0-beta.5

### Minor Changes

- adfb590: feat: implement trigger-based modal animation system

  - Add `GestureTrigger` component for registering trigger elements
  - Implement trigger position-based modal open/close animations
  - Add `GestureViewerRegistry` for managing trigger nodes
  - Support customizable animation config (duration, easing, callbacks)
  - Enable smooth transition from trigger element to full modal view

  Example:

  ```tsx
  import { GestureTrigger, GestureViewer } from 'react-native-gesture-image-viewer';

  // Wrap your thumbnail with GestureTrigger
  <GestureTrigger id="gallery" onPress={() => openModal(index)}>
    <Pressable style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImage} />
    </Pressable>
  </GestureTrigger>

  // Configure GestureViewer with matching id
  <GestureViewer
    id="gallery"
    data={images}
    renderItem={renderImage}
    triggerAnimation={{
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      onAnimationComplete: () => console.log('Animation finished!')
    }}
  />
  ```

### Patch Changes

- 8856347: fix: disable the dismiss pan gesture when `dismiss.enabled` is false
- d32950f: docs: add trigger-based modal animations documentation

## 2.0.0-beta.4

### Patch Changes

- b81f5a3: feat!: add `useGestureViewerState` hook and refactor controller

  - Add `useGestureViewerState` hook to access `currentIndex` and `totalCount`
  - Refactor `useGestureViewerController` to return control methods only
  - Rename `GestureViewerControllerState` to `GestureViewerState`
  - Update exports and type definitions

  BREAKING CHANGE: `useGestureViewerController` no longer returns `currentIndex` and `totalCount`. Use `useGestureViewerState` instead.

  Example:

  ```diff
  import {
    GestureViewer,
  -  GestureViewerControllerState,
  +  GestureViewerState
    useGestureViewerController,
    useGestureViewerEvent,
  +  useGestureViewerState,
  } from 'react-native-gesture-image-viewer';

  const {
    goToIndex, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom, rotate,
  -  currentIndex, totalCount
  } = useGestureViewerController();

  + const { currentIndex, totalCount } = useGestureViewerState();
  ```

- fae40a9: refactor!: remove `onIndexChange` prop in favor of state hook

  - Remove `onIndexChange` prop from `GestureViewerProps`
  - For current index: use `useGestureViewerState` hook
  - For index changes: use `useGestureViewerState` with `useEffect`
  - Update component implementation to remove prop handling

  Example:

  ```tsx
  // Before
  <GestureViewer onIndexChange={(index) => console.log(index)} />;

  // After
  const { currentIndex } = useGestureViewerState();

  useEffect(() => {
    console.log(currentIndex);
  }, [currentIndex]);
  ```

  **❗ BREAKING CHANGE: onIndexChange prop removed. Use useGestureViewerState for current index and useEffect for change detection.**

- 37087da: refactor!: improve props naming for better developer experience

  - Replace ambiguous gesture props with clearer names
  - Group dismiss-related options into single object
  - Standardize `enable\*` pattern for gesture controls

  **❗ BREAKING CHANGE:**

  - `enableDismissGesture` → `dismiss.enabled`
  - `dismissThreshold` → `dismiss.threshold`
  - `resistance` → `dismiss.resistance`
  - `animateBackdrop` → `dismiss.fadeBackdrop`
  - `useSnap` → `enableSnapMode`
  - `enableZoomPanGesture` → `enablePanWhenZoomed`
  - `enableZoomGesture` → `enablePinchZoom`
  - `enableSwipeGesture` → `enableHorizontalSwipe`

  Example:

  ```tsx
  <GestureViewer
    dismiss={{
      enabled: true,
      threshold: 80,
      resistance: 2,
      fadeBackdrop: true,
    }}
    enableSnapMode
    enablePanWhenZoomed
    enablePinchZoom
    enableHorizontalSwipe
  />
  ```

- 816ab00: docs: complete v2 documentation setup

  - Add v2 guide pages and API documentation
  - Create v2 home pages (en/ko) with feature highlights
  - Add migration guide from 1.x to 2.x with breaking changes
  - Add cross-version compatibility warnings for Reanimated v3/v4
  - Complete API documentation translation (props, hooks, events)
  - Set up v2 as default version in rspress config

## 2.0.0-beta.3

### Patch Changes

- 91320d6: fix(useGestureViewerController): Prevent tearing and optimize rendering

  - Refactors `useGestureViewerController` to use [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
  - This change resolves a potential tearing bug that can occur in concurrent mode by ensuring the hook's state is always synchronized with the external store.
  - Optimized the update logic to prevent unnecessary re-renders when currentIndex or totalCount remain unchanged, improving performance.

## 2.0.0-beta.2

### Patch Changes

- 929579f: fix: remove key prop from list item children for better performance

  - Remove key prop from View children when using FlatList/FlashList
  - Keep key prop only for ScrollView children
  - Improves FlashList performance by allowing proper item reuse
  - Follows FlashList official performance guidelines

  Refs: https://shopify.github.io/flash-list/docs/fundamentals/performance#remove-key-prop

## 2.0.0-beta.1

### Patch Changes

- e5f9744: fix: prevent multiple `onIndexChange` calls during initialization

  - Remove redundant currentIndex state to avoid duplicate callbacks
  - Use manager subscription as single source of truth for index changes
  - Implement ref pattern for `onIndexChange` to prevent stale closures
  - Ensure `onIndexChange` only fires on actual user interactions, not internal state changes

  Now `onIndexChange` correctly fires only once during initialization.

  Fixes #67

## 2.0.0-beta.0

### Major Changes

- db35df7: feat: upgraded react-native-reanimated v4

  - Upgraded react-native-reanimated to version 4.x.
  - Added react-native-worklets as a dependency.
  - Enhanced `withSpring` animation responsiveness and behavior.
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x

  Reanimated Configure Migration Guide:

  ```bash
  npm install react-native-worklets
  ```

  ```diff
  // babel.config.js
  module.exports = (api) => {
    api.cache(true);

    return getConfig(
      {
        presets: ['babel-preset-expo'],
        plugins: [
          // for web
          '@babel/plugin-proposal-export-namespace-from',
          // react-native-worklets/plugin has to be listed last.
  -       'react-native-reanimated/plugin',
  +       'react-native-worklets/plugin',
        ],
      },
      { root, pkg },
    );
  };
  ```

  ```diff
  // metro.config.js
  const path = require('path');
  const { getDefaultConfig } = require('@expo/metro-config');
  const { withMetroConfig } = require('react-native-monorepo-config');
  - const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

  const root = path.resolve(__dirname, '..');

  /**
   * Metro configuration
   * https://facebook.github.io/metro/docs/configuration
   *
   * @type {import('metro-config').MetroConfig}
   */
  const config = withMetroConfig(getDefaultConfig(__dirname), {
    root,
    dirname: __dirname,
  });

  config.resolver.unstable_enablePackageExports = true;

  - module.exports = wrapWithReanimatedMetroConfig(config);
  + module.exports = config
  ```

## 1.6.2

### Patch Changes

- b8ec554: docs: migrate README content to docs site and update homepage
  - Move detailed documentation from README to dedicated docs site
  - Update package.json homepage field to point to new docs URL
  - Full documentation is available at: https://react-native-gesture-image-viewer.pages.dev

## 1.6.1

### Patch Changes

- 9e5a6bd: refactor(loop): replace timeout with event-driven loop animation

  - Remove hardcoded 300ms timeout dependency
  - Use onMomentumScrollEnd for accurate animation completion detection
  - Implement callback-based approach for better timing control
  - Handle user scroll interruption during loop transitions

## 1.6.0

### Minor Changes

- 5e92961: feat: add loop mode for GestureViewer

  - Add `enableLoop` prop for seamless boundary crossing
  - Implement `goToNext`/`goToPrevious` with loop animation
  - Support both FlatList, FlashList and ScrollView components

  Example usage:

  ```tsx
  // New prop
  <GestureViewer
    enableLoop={true} // Enable loop mode
    data={images}
    renderItem={renderItem}
  />;

  // Enhanced controller methods
  const { goToNext, goToPrevious } = useGestureViewerController();
  // Now supports loop transitions when enableLoop is true
  ```

## 1.5.1

### Patch Changes

- 4c49b1c: docs: update style customization section in kr md

## 1.5.0

### Minor Changes

- 4d6e935: feat: add event system with useGestureViewerEvent hook

  - Add zoomChange and rotationChange event support
  - Add comprehensive TypeScript support with proper event data typing
  - Update README with usage examples and API documentation

  Example usage:

  ```tsx
  import {
    GestureViewer,
    useGestureViewerEvent,
  } from "react-native-gesture-image-viewer";

  function App() {
    // Listen to zoom changes on the default instance (ID: 'default')
    useGestureViewerEvent("zoomChange", (data) => {
      console.log(`Zoom changed from ${data.previousScale} to ${data.scale}`);
    });

    // Listen to rotation changes on the default instance (ID: 'default')
    useGestureViewerEvent("rotationChange", (data) => {
      console.log(
        `Rotation changed from ${data.previousRotation}° to ${data.rotation}°`
      );
    });

    // Listen to events on a specific instance
    useGestureViewerEvent("gallery", "zoomChange", (data) => {
      console.log(`Gallery zoom: ${data.scale}x`);
    });

    return <GestureViewer data={images} renderItem={renderImage} />;
  }
  ```

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
