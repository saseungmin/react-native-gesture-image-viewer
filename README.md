# React Native Gesture Image Viewer

> English | [한국어](./README-ko_kr.md)

## Overview

Have you ever struggled with implementing complex gesture handling and animations when building image galleries or content viewers in React Native?

Existing libraries often have limited customization options or performance issues. `react-native-gesture-image-viewer` is a high-performance **universal gesture viewer** library built on React Native Reanimated and Gesture Handler, providing complete customization and intuitive gesture support for not only images but also videos, custom components, and any other content.

### Key Features

- ✅ **Complete Gesture Support** - Pinch zoom, double-tap zoom, swipe navigation, vertical drag dismiss
- ✅ **High-Performance Animations** - Smooth 60fps animations powered by React Native Reanimated
- ✅ **Full Customization** - Complete control over components, styles, and behaviors
- ✅ **External Control API** - Programmatic control from buttons or other components
- ✅ **Multi-Instance Management** - ID-based independent management of multiple viewers
- ✅ **Flexible Integration** - Use with FlatList, FlashList, Expo Image, FastImage, and more
- ✅ **Full TypeScript Support** - Enhanced developer experience with smart type inference
- ✅ **Cross-Platform** - iOS, Android, and Web support
- ✅ **Easy-to-Use API** - Intuitive and simple implementation without complex setup
- ✅ **Various Environment Support** - Expo Go and New Architecture support

## Quick Start

### Examples & Demo
- [📁 Example Project](/example/) - Real implementation code with various use cases
- [🤖 Expo Go](https://snack.expo.dev/@harang/react-native-gesture-image-viewer) - Try it instantly on Snack Expo

### Prerequisites

> [!IMPORTANT]
> `react-native-gesture-image-viewer` is a high-performance viewer library built on [`react-native-reanimated`](https://www.npmjs.com/package/react-native-reanimated) and [`react-native-gesture-handler`](https://www.npmjs.com/package/react-native-gesture-handler).    
> Therefore, you must install React Native Reanimated and Gesture Handler before using this library. Please refer to the official documentation of these libraries for detailed setup guides.

```bash
npm install react-native-reanimated
npm install react-native-gesture-handler
```

#### Minimum Requirements

|Library|Minimum Version|
|:--|:--:|
|`react`|`>=18.0.0`|
|`react-native`|`>=0.75.0`|
|`react-native-gesture-handler`|`>=2.24.0`|
|`react-native-reanimated`|`>=3.0.0`|

#### [React Native Reanimated Setup](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/)

Add the plugin to your `babel.config.js`:

```js
// babel.config.js
module.exports = {
  presets: [
    ... // don't add it here :)
  ],
  plugins: [
    ...
    // for web
    '@babel/plugin-proposal-export-namespace-from',
    // react-native-reanimated/plugin has to be listed last.
    'react-native-reanimated/plugin',
  ],
};
```

Wrap your Metro config with `wrapWithReanimatedMetroConfig` in `metro.config.js`:

```js
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const config = {
  // Your existing Metro configuration options
};

module.exports = wrapWithReanimatedMetroConfig(config);
```

#### [react-native-gesture-handler Setup](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation)

- `react-native-gesture-handler` generally doesn't require additional setup, but please refer to the official documentation for your specific environment.
- For [using gestures in Android modals](https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/installation#android), you would normally need to wrap modal content with `GestureHandlerRootView`. However, this library already includes `GestureHandlerRootView` internally, so no additional wrapping is needed when using modals.

### Installation

```bash
# npm
npm install react-native-gesture-image-viewer

# pnpm
pnpm add react-native-gesture-image-viewer

# yarn
yarn add react-native-gesture-image-viewer

# bun
bun add react-native-gesture-image-viewer
```

## Usage

### Basic Usage

`react-native-gesture-image-viewer` is a library focused purely on gesture interactions for complete customization.   
You can create a viewer using any `Modal` of your choice as shown below:   

```tsx
import { Image, Modal } from 'react-native';
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  const images = [...];
  const [visible, setVisible] = useState(false);

  // Wrap with useCallback for performance optimization
  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
  }, []);

  return (
    <Modal visible={visible} onRequestClose={() => setVisible(false)}>
      <GestureImageViewer
        data={images}
        renderImage={renderImage}
        onDismiss={() => setVisible(false)}
      />
    </Modal>
  );
}
```

### Gesture Features

`react-native-gesture-image-viewer` supports various gestures essential for viewers. All gestures are enabled by default.

```tsx
function App() {
  return (
    <GestureImageViewer
      data={images}
      renderImage={renderImage}
      enableDismissGesture
      enableSwipeGesture
      enableZoomGesture
      enableDoubleTapGesture
      enableZoomPanGesture
    />
  )
}
```

|Property|Description|Default|
|:--:|:-----|:--:|
|`enableDismissGesture`|Calls `onDismiss` function when swiping down. Useful for closing modals with downward swipe gestures.|`true`|
|`enableSwipeGesture`|Controls left/right swipe gestures. When `false`, horizontal gestures are disabled.|`true`|
|`enableZoomGesture`|Controls two-finger pinch gestures. When `false`, two-finger zoom gestures are disabled.|`true`|
|`enableDoubleTapGesture`|Controls double-tap zoom gestures. When `false`, double-tap zoom gestures are disabled.|`true`|
|`enableZoomPanGesture`|Only works when zoom is active, allows moving item position when zoomed. When `false`, gesture movement is disabled during zoom.|`true`|

### Custom Components

`react-native-gesture-image-viewer` offers powerful complete component customization. You can create gesture-supported items with not only images but any component you want.   

#### List Components

Support for any list component like `ScrollView`, `FlatList`, `FlashList` through the `ListComponent` prop.   
The `listProps` provides **type inference based on the selected list component**, ensuring accurate autocompletion and type safety in your IDE.

```tsx
import { FlashList } from '@shopify/flash-list';

function App() {
  return (
    <GestureImageViewer
      data={images}
      ListComponent={FlashList}
      listProps={{
        // ✅ FlashList props autocompletion
      }}
    />
  );
}
```

#### Content Components

You can inject various types of content components like `expo-image`, `FastImage`, etc., through the `renderImage` prop to use gestures.

```tsx
import { GestureImageViewer } from 'react-native-gesture-image-viewer';
import { Image } from 'expo-image';

function App() {
  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" />;
  }, []);

  return (
    <GestureImageViewer
      data={images}
      renderImage={renderImage}
    />
  );
}
```

### External Control API

`react-native-gesture-image-viewer` provides powerful hooks for programmatic control from buttons or other components.

```tsx
import { GestureImageViewer, useImageViewerController } from 'react-native-gesture-image-viewer';

function App() {
  const { goToIndex, goToPrevious, goToNext, currentIndex, totalCount } = useImageViewerController();

  return (
    <View>
      <GestureImageViewer
        data={images}
        renderImage={renderImage}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          gap: 10,
          flexDirection: 'column',
        }}
      >
        <Feather.Button name="chevron-left" onPress={goToPrevious} />
        <Button title="Jump to index 2" onPress={() => goToIndex(2)} />
        <Feather.Button name="chevron-right" onPress={goToNext} />
        <Text>{`${currentIndex + 1} / ${totalCount}`}</Text>
      </View>
    </View>
  );
}
```

### Style Customization

You can customize the styling of `GestureImageViewer`.

```tsx
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  return (
    <GestureImageViewer
      animateBackdrop={false}
      width={400}
      itemSpacing={20}
      containerStyle={{ /* ... */ }}
      backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.90)' }}
      renderContainer={(children) => <View style={{ flex: 1 }}>{children}</View>}
    />
  );
}
```

|Property|Description|Default|
|:--:|:-----|:--:|
|`animateBackdrop`|By default, the background `opacity` gradually decreases from 1 to 0 during downward swipe gestures. When `false`, this animation is disabled.|`true`|
|`width`|The width of content items. Default is window width.|`Dimensions width`|
|`itemSpacing`|Specifies the spacing between list items.|`0`|
|`containerStyle`|Allows custom styling of the container that wraps the list component.|`flex: 1`|
|`backdropStyle`|Allows customization of the viewer's background style.|`backgroundColor: black; StyleSheet.absoluteFill;`|
|`renderContainer`|Allows custom wrapper component around `<GestureImageViewer />`.||

### Multi-Instance Management

When you want to efficiently manage multiple `GestureImageViewer` instances, you can use the `id` prop to use multiple `GestureImageViewer` components.   
`GestureImageViewer` automatically removes instances from memory when components are unmounted, so no manual memory management is required.   

> The default `id` value is `default`.

```tsx
import { GestureImageViewer, useImageViewerController } from 'react-native-gesture-image-viewer';

const firstViewerId = 'firstViewerId';
const secondViewerId = 'secondViewerId';

function App() {
  const { currentIndex: firstCurrentIndex, totalCount: firstTotalCount } = useImageViewerController(firstViewerId);
  const { currentIndex: secondCurrentIndex, totalCount: secondTotalCount } = useImageViewerController(secondViewerId);

  return (
    <View>
      <GestureImageViewer
        id={firstViewerId}
        data={images}
        renderImage={renderImage}
      />
      <GestureImageViewer
        id={secondViewerId}
        data={images}
        renderImage={renderImage}
      />
    </View>
  );
}
```

### Additional Props

#### `onIndexChange`
The `onIndexChange` callback function is called when the `index` value changes.

```tsx
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <GestureImageViewer
      onIndexChange={setCurrentIndex}
    />
  );
}
```

#### `initialIndex` (default: `0`)
Sets the initial index value.

#### `dismissThreshold` (default: `80`)
`dismissThreshold` controls when `onDismiss` is called by applying a threshold value during vertical gestures.

#### `resistance` (default: `2`)
`resistance` controls the range of vertical movement by applying resistance during vertical gestures.

#### `maxZoomScale` (default: `2`)
Controls the maximum zoom scale multiplier.

## Performance Optimization Tips

- Wrap the `renderImage` function with `useCallback` to prevent unnecessary re-renders.
- For large images, we recommend using `FastImage` or `expo-image`.
- For handling many images, we recommend using `FlashList`.
- Test on actual devices (performance may be limited in simulators).

## Contributing

For details on how to contribute to the project and set up the development environment, please refer to the [Contributing Guide](CONTRIBUTING.md).

## License

[MIT](./LICENSE)
