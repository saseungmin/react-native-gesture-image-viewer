import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GestureTrigger,
  GestureViewer,
  type GestureViewerRenderItemInfo,
  useGestureViewerEvent,
  useGestureViewerState,
} from 'react-native-gesture-image-viewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const images = [
  { name: 'red', source: require('../../assets/e2e/red.png'), width: 640, height: 480 },
  { name: 'green', source: require('../../assets/e2e/green.png'), width: 640, height: 480 },
  { name: 'blue', source: require('../../assets/e2e/blue.png'), width: 640, height: 480 },
];
type FixtureImage = (typeof images)[number];

// This screen is selected only by the E2E build. Observations use public library APIs;
// tests still have to deliver real native gestures to change these values.
export default function E2EScreen() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [openingComplete, setOpeningComplete] = useState(false);
  const { currentIndex, totalCount } = useGestureViewerState();

  useGestureViewerEvent('zoomChange', ({ scale: nextScale }) => {
    setScale(nextScale);
  });

  const renderImage = useCallback(
    (image: FixtureImage, _index: number, { isActive }: GestureViewerRenderItemInfo) => (
      <Image
        accessibilityLabel={isActive ? `Image ${image.name}` : undefined}
        accessible={isActive}
        testID={isActive ? 'e2e-current-image' : undefined}
        source={image.source}
        contentFit="contain"
        pointerEvents="none"
        style={styles.image}
        onLoad={() => {
          setLoaded((previous) =>
            previous.includes(image.name) ? previous : [...previous, image.name],
          );
        }}
      />
    ),
    [],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24 }]} testID="e2e-home">
      <Text style={styles.title}>Gesture viewer E2E</Text>
      <View style={styles.thumbnails}>
        {images.map((image, index) => (
          <GestureTrigger
            key={image.name}
            index={index}
            onPress={() => {
              setInitialIndex(index);
              setScale(1);
              setOpeningComplete(false);
              setVisible(true);
            }}
          >
            <Pressable
              testID={`e2e-open-${index}`}
              accessibilityLabel={`Open image ${index + 1}`}
              accessibilityRole="button"
            >
              <Image source={image.source} style={styles.thumbnail} />
            </Pressable>
          </GestureTrigger>
        ))}
      </View>
      <Modal visible={visible} animationType="none" onRequestClose={() => setVisible(false)}>
        <View style={styles.viewer} testID="e2e-viewer" collapsable={false}>
          <GestureViewer
            data={images}
            initialIndex={initialIndex}
            maxZoomScale={4}
            getItemDimensions={(image) => image}
            renderItem={renderImage}
            onDismiss={() => setVisible(false)}
            triggerAnimation={{ onAnimationComplete: () => setOpeningComplete(true) }}
            renderContainer={(children, { dismiss }) => (
              <View style={styles.viewer}>
                {children}
                <View style={[styles.status, { top: insets.top + 8 }]} pointerEvents="box-none">
                  <View pointerEvents="none">
                    <Text style={styles.text} testID="e2e-page">
                      {currentIndex + 1}/{totalCount}
                    </Text>
                    <Text style={styles.text} testID="e2e-scale">
                      {scale.toFixed(3)}
                    </Text>
                    <Text style={styles.text} testID="e2e-ready">
                      {openingComplete && loaded.includes(images[currentIndex]?.name ?? '')
                        ? 'ready'
                        : 'loading'}
                    </Text>
                  </View>
                  <Pressable
                    testID="e2e-close"
                    accessibilityLabel="Close viewer"
                    accessibilityRole="button"
                    onPress={dismiss}
                    style={styles.close}
                  >
                    <Text style={styles.text}>Close</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24 },
  title: { color: '#111111', fontSize: 22, marginBottom: 24 },
  thumbnails: { flexDirection: 'row', gap: 16 },
  thumbnail: { width: 88, height: 66 },
  viewer: { flex: 1, backgroundColor: '#111111' },
  image: { width: '100%', height: '100%' },
  status: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  text: { color: '#ffffff', fontSize: 16, fontVariant: ['tabular-nums'] },
  close: { padding: 16, backgroundColor: '#333333' },
});
