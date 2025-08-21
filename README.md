# React Native Gesture Image Viewer

> English | [한국어](./README-ko_kr.md)

<div align="center">
  <img src="./assets/logo.png" width="300px" alt="React Native Gesture Image Viewer logo" />
</div>

## Overview

Have you ever struggled with implementing complex gesture handling and animations when building image galleries or content viewers in React Native?

Existing libraries often have limited customization options or performance issues. `react-native-gesture-image-viewer` is a high-performance **universal gesture viewer** library built on React Native Reanimated and Gesture Handler, providing complete customization and intuitive gesture support for not only images but also videos, custom components, and any other content.

<p align="center">
  <img src="./assets/example.gif" width="600" alt="Gesture and zoom demo" />
</p>

### Key Features

- 🤌 **Complete Gesture Support** - Pinch zoom, double-tap zoom, swipe navigation, pan when zoomed-in, and vertical drag to dismiss
- 🏎️ **High-Performance Animations** - Smooth and responsive animations at 60fps and beyond, powered by React Native Reanimated
- 🎨 **Full Customization** - Total control over components, styles, and gesture behavior
- 🎛️ **External Control API** - Trigger actions programmatically from buttons or other UI components
- 🧩 **Multi-Instance Management** - Manage multiple viewers independently using unique IDs
- 🧬 **Flexible Integration** - Use with Modal, [React Native Modal](https://www.npmjs.com/package/react-native-modal), ScrollView, FlatList, [FlashList](https://www.npmjs.com/package/@shopify/flash-list), [Expo Image](https://www.npmjs.com/package/expo-image), [FastImage](https://github.com/DylanVann/react-native-fast-image), and more
- 🧠 **Full TypeScript Support** - Great developer experience with type inference and safety
- 🌐 **Cross-Platform** - Runs on iOS, Android, and Web with Expo Go and New Architecture compatibility
- 🪄 **Easy-to-Use API** - Simple and intuitive API that requires minimal setup

## Quick Start

### 📚 Documentation

Full documentation is available at: <https://react-native-gesture-image-viewer.pages.dev>

### Examples & Demo

- [📁 Example Project](/example/) - Real implementation code with various use cases
- [🤖 Expo Go](https://snack.expo.dev/@harang/react-native-gesture-image-viewer) - Try it instantly on Snack Expo

### Basic Usage

`react-native-gesture-image-viewer` is a library focused purely on gesture interactions for complete customization.  

```tsx
import { useCallback, useState } from 'react';
import { ScrollView, Image, Modal, View, Text, Button, Pressable } from 'react-native';
import {
  GestureViewer,
  GestureTrigger,
  useGestureViewerController,
  useGestureViewerEvent,
} from 'react-native-gesture-image-viewer';

function App() {
  const images = [...];
  const [visible, setVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { goToIndex, goToPrevious, goToNext, currentIndex, totalCount } = useGestureViewerController();

  const openModal = (index: number) => {
    setSelectedIndex(index);
    setVisible(true);
  };

  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
  }, []);

  useGestureViewerEvent('zoomChange', (data) => {
    console.log(`Zoom changed from ${data.previousScale} to ${data.scale}`);
  });

  return (
    <View>
      {images.map((uri, index) => (
        <GestureTrigger key={uri} onPress={() => openModal(index)}>
          <Pressable>
            <Image source={{ uri }} />
          </Pressable>
        </GestureTrigger>
      ))}
      <Modal transparent visible={visible}>
        <GestureViewer
          data={images}
          initialIndex={selectedIndex}
          renderItem={renderImage}
          ListComponent={ScrollView}
          onDismiss={() => setVisible(false)}
        />
        <View>
          <Button title="Prev" onPress={goToPrevious} />
          <Button title="Jump to index 2" onPress={() => goToIndex(2)} />
          <Button title="Next" onPress={goToNext} />
          <Text>{`${currentIndex + 1} / ${totalCount}`}</Text>
        </View>
      </Modal>
    </View>
  );
}
```

## Contributing

For details on how to contribute to the project and set up the development environment, please refer to the [Contributing Guide](CONTRIBUTING.md).

## License

[MIT](./LICENSE)
