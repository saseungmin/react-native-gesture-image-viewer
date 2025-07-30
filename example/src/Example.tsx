import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Button, Modal, StyleSheet, Text, View } from 'react-native';
import { GestureViewer, useGestureViewerController, useGestureViewerEvent } from 'react-native-gesture-image-viewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const images = [
  'https://picsum.photos/400/200',
  'https://picsum.photos/300/200',
  'https://picsum.photos/200/200',
  'https://picsum.photos/200/300',
  'https://picsum.photos/200/400',
];

function Example() {
  const [visible, setVisible] = useState(false);
  const [enableLoop, setEnableLoop] = useState(false);

  const { goToIndex, goToPrevious, goToNext, currentIndex, totalCount, zoomIn, zoomOut, resetZoom, rotate } =
    useGestureViewerController();

  const insets = useSafeAreaInsets();

  useGestureViewerEvent('zoomChange', (data) => {
    console.log(`Zoom changed from ${data.previousScale} to ${data.scale}`);
  });

  useGestureViewerEvent('rotationChange', (data) => {
    console.log(`Rotation changed from ${data.previousRotation}° to ${data.rotation}°`);
  });
  const renderImage = useCallback((imageUrl: string) => {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: '100%' }}
        pointerEvents="none"
        contentFit="contain"
      />
    );
  }, []);

  return (
    <View style={styles.container}>
      <Button title={`Loop: ${enableLoop ? 'ON' : 'OFF'}`} onPress={() => setEnableLoop(!enableLoop)} />
      <Button title="Open Gallery" onPress={() => setVisible(true)} />
      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1 }}>
          <GestureViewer
            data={images}
            initialIndex={0}
            onDismiss={() => setVisible(false)}
            enableLoop={enableLoop}
            ListComponent={FlashList}
            renderItem={renderImage}
            backdropStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.90)' }}
            renderContainer={(children) => <View style={{ flex: 1 }}>{children}</View>}
          />
          <View
            style={{
              position: 'absolute',
              top: insets.top + 10,
              left: 10,
              zIndex: 1000,
              flexDirection: 'row',
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'column' }}>
              <Feather.Button
                name="zoom-in"
                size={30}
                iconStyle={{ marginRight: 0 }}
                backgroundColor="transparent"
                color="white"
                onPress={() => zoomIn(0.25)}
              />
              <Feather.Button
                name="zoom-out"
                size={30}
                iconStyle={{ marginRight: 0 }}
                backgroundColor="transparent"
                color="white"
                onPress={() => zoomOut(0.25)}
              />
              <Feather.Button
                name="refresh-cw"
                size={30}
                iconStyle={{ marginRight: 0 }}
                backgroundColor="transparent"
                color="white"
                onPress={() => {
                  rotate(0);
                  resetZoom();
                }}
              />
            </View>
            <View style={{ flexDirection: 'column' }}>
              <Feather.Button
                name="rotate-cw"
                size={30}
                iconStyle={{ marginRight: 0 }}
                backgroundColor="transparent"
                color="white"
                onPress={() => rotate()}
              />
              <Feather.Button
                name="rotate-ccw"
                size={30}
                iconStyle={{ marginRight: 0 }}
                backgroundColor="transparent"
                color="white"
                onPress={() => rotate(90, false)}
              />
            </View>
          </View>
          <View
            style={{
              position: 'absolute',
              top: insets.top + 10,
              right: 10,
              zIndex: 1000,
            }}
          >
            <Feather.Button
              name="x"
              size={30}
              iconStyle={{ marginRight: 0 }}
              backgroundColor="transparent"
              color="white"
              onPress={() => setVisible(false)}
            />
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + 10,
              left: 0,
              right: 0,
              gap: 10,
              flexDirection: 'column',
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-around', alignItems: 'center' }}>
              <Feather.Button
                backgroundColor="transparent"
                name="chevron-left"
                size={30}
                iconStyle={{ marginRight: 0 }}
                color="white"
                onPress={goToPrevious}
              />
              <Button title="Jump to 3" onPress={() => goToIndex(2)} />
              <Feather.Button
                backgroundColor="transparent"
                name="chevron-right"
                size={30}
                iconStyle={{ marginRight: 0 }}
                color="white"
                onPress={goToNext}
              />
            </View>
            <Text style={{ textAlign: 'center', color: 'white' }}>{`${currentIndex + 1} / ${totalCount}`}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Example;
