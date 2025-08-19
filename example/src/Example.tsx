import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Button, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GestureTrigger,
  GestureViewer,
  useGestureViewerController,
  useGestureViewerEvent,
  useGestureViewerState,
} from 'react-native-gesture-image-viewer';
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
  const [showExternalUI, setShowExternalUI] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { goToIndex, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom, rotate } = useGestureViewerController();

  const { currentIndex, totalCount } = useGestureViewerState();

  const insets = useSafeAreaInsets();

  const modalOpen = useCallback((index: number) => {
    setSelectedIndex(index);
    setShowExternalUI(true);
    setVisible(true);
  }, []);

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
      <View style={styles.buttonWrapper}>
        <Button title={`Loop: ${enableLoop ? 'ON' : 'OFF'}`} onPress={() => setEnableLoop(!enableLoop)} />
        <Text style={styles.text}>Click on thumbnail to open!</Text>
        <View style={styles.galleryContainer}>
          {images.map((uri, index) => (
            <GestureTrigger key={uri} onPress={() => modalOpen(index)}>
              <Pressable style={styles.thumb}>
                <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
              </Pressable>
            </GestureTrigger>
          ))}
        </View>
      </View>
      <Modal visible={visible} transparent onRequestClose={() => setVisible(false)} animationType="none">
        <View style={{ flex: 1 }}>
          <GestureViewer
            data={images}
            initialIndex={selectedIndex}
            onDismiss={() => setVisible(false)}
            onDismissStart={() => setShowExternalUI(false)}
            enableLoop={enableLoop}
            ListComponent={FlashList}
            renderItem={renderImage}
            backdropStyle={{ backgroundColor: '#181818' }}
            renderContainer={(children, helpers) => (
              <View style={{ flex: 1 }}>
                {children}
                {showExternalUI && (
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
                      onPress={helpers.dismiss}
                    />
                  </View>
                )}
              </View>
            )}
          />
          {showExternalUI && (
            <>
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
            </>
          )}
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
  buttonWrapper: {
    gap: 16,
  },
  galleryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 360,
  },
  thumb: {
    width: 110,
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  text: {
    textAlign: 'center',
    color: '#222',
    fontSize: 22,
    fontWeight: 'bold',
  },
});

export default Example;
