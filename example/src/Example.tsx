import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { Button, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GestureTrigger,
  GestureViewer,
  type GestureViewerProps,
  type GestureViewerRenderItemInfo,
  useGestureViewerController,
  useGestureViewerEvent,
  useGestureViewerState,
} from 'react-native-gesture-image-viewer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const photos = [
  {
    uri: 'https://picsum.photos/400/200',
    note: 'Single tap anywhere to hide or show the viewer controls.',
  },
  {
    uri: 'https://picsum.photos/300/200',
    note: 'Pinch to zoom and swipe left or right to move between items.',
  },
  {
    uri: 'https://picsum.photos/200/200',
    note: 'Use the toolbar buttons for zoom, rotate, and reset actions.',
  },
  {
    uri: 'https://picsum.photos/200/300',
    note: 'Swipe down to dismiss the viewer at any time.',
  },
  {
    uri: 'https://picsum.photos/200/400',
    note: 'Loop mode lets you keep paging without stopping at the end.',
  },
] as const;

type HorizontalSwipeOptions = GestureViewerProps<string>['horizontalSwipe'];

type ScenarioId = 'default' | 'disabled' | 'distance' | 'velocity' | 'disabledAutoplay';

type Scenario = {
  label: string;
  description: string;
  horizontalSwipe?: HorizontalSwipeOptions;
  autoPlay?: boolean;
  autoPlayInterval?: number;
};

const scenarios: Record<ScenarioId, Scenario> = {
  default: {
    label: 'Default',
    description: 'Omitted horizontalSwipe prop',
  },
  disabled: {
    label: 'Disabled',
    description: 'Horizontal drag disabled; controls still work',
    horizontalSwipe: { enabled: false },
  },
  distance: {
    label: 'Distance',
    description: 'ratio 0.5, velocity 100000',
    horizontalSwipe: { distanceThresholdRatio: 0.5, velocityThreshold: 100_000 },
  },
  velocity: {
    label: 'Velocity',
    description: 'ratio 10, velocity 100',
    horizontalSwipe: { distanceThresholdRatio: 10, velocityThreshold: 100 },
  },
  disabledAutoplay: {
    label: 'No drag + autoplay',
    description: 'Drag disabled, autoplay every 1000ms',
    autoPlay: true,
    autoPlayInterval: 1000,
    horizontalSwipe: { enabled: false },
  },
};

const scenarioIds: ScenarioId[] = [
  'default',
  'disabled',
  'distance',
  'velocity',
  'disabledAutoplay',
];

function Example() {
  const [visible, setVisible] = useState(false);
  const [enableLoop, setEnableLoop] = useState(false);
  const [showExternalUI, setShowExternalUI] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('default');

  const { goToIndex, goToPrevious, goToNext, zoomIn, zoomOut, resetZoom, rotate } =
    useGestureViewerController();

  const { currentIndex, totalCount } = useGestureViewerState();

  const insets = useSafeAreaInsets();
  const selectedScenario = scenarios[selectedScenarioId];

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

  useGestureViewerEvent('tap', (data) => {
    if (data.kind === 'single') {
      console.log(`Tapped item ${data.index} at (${data.x}, ${data.y})`);
    }
  });

  const renderImage = useCallback(
    (imageUrl: string, _index: number, { isActive }: GestureViewerRenderItemInfo) => {
      return (
        <Image
          accessibilityLabel={isActive ? 'Current image' : undefined}
          accessible={isActive}
          contentFit="contain"
          pointerEvents="none"
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
        />
      );
    },
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        <Button
          title={`Loop: ${enableLoop ? 'ON' : 'OFF'}`}
          onPress={() => setEnableLoop(!enableLoop)}
        />
        <View style={styles.scenarioGroup}>
          <Text style={styles.scenarioTitle}>Horizontal swipe preset</Text>
          <View style={styles.scenarioOptions}>
            {scenarioIds.map((scenarioId) => {
              const scenario = scenarios[scenarioId];
              const selected = scenarioId === selectedScenarioId;

              return (
                <Pressable
                  key={scenarioId}
                  onPress={() => setSelectedScenarioId(scenarioId)}
                  style={[styles.scenarioButton, selected && styles.scenarioButtonSelected]}
                >
                  <Text
                    style={[
                      styles.scenarioButtonText,
                      selected && styles.scenarioButtonTextSelected,
                    ]}
                  >
                    {scenario.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.subtext}>{selectedScenario.description}</Text>
        </View>
        <Text style={styles.text}>Click on a thumbnail to open the viewer.</Text>
        <View style={styles.galleryContainer}>
          {photos.map(({ uri }, index) => (
            <GestureTrigger key={uri} index={index} onPress={() => modalOpen(index)}>
              <Pressable style={styles.thumb}>
                <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
              </Pressable>
            </GestureTrigger>
          ))}
        </View>
      </View>
      <Modal
        visible={visible}
        transparent
        onRequestClose={() => setVisible(false)}
        animationType="none"
      >
        <View style={{ flex: 1 }}>
          <GestureViewer
            data={photos.map(({ uri }) => uri)}
            initialIndex={selectedIndex}
            onDismiss={() => setVisible(false)}
            onDismissStart={() => setShowExternalUI(false)}
            autoPlay={selectedScenario.autoPlay}
            autoPlayInterval={selectedScenario.autoPlayInterval}
            enableLoop={enableLoop}
            pageSpacing={16}
            renderItem={renderImage}
            {...(selectedScenario.horizontalSwipe
              ? { horizontalSwipe: selectedScenario.horizontalSwipe }
              : {})}
            dismiss={{
              direction: 'both',
            }}
            onSingleTap={() => setShowExternalUI((prev) => !prev)}
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
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    justifyContent: 'space-around',
                    alignItems: 'center',
                  }}
                >
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
                <Text style={{ textAlign: 'center', color: 'white' }}>
                  {`${currentIndex + 1} / ${totalCount}`}
                </Text>
                <Text style={styles.noteText}>{photos[currentIndex]?.note}</Text>
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
  scenarioButton: {
    borderColor: '#aaa',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  scenarioButtonSelected: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  scenarioButtonText: {
    color: '#222',
    fontSize: 13,
    fontWeight: '600',
  },
  scenarioButtonTextSelected: {
    color: 'white',
  },
  scenarioGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  scenarioOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  scenarioTitle: {
    color: '#222',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtext: {
    textAlign: 'center',
    color: '#666',
    maxWidth: 320,
  },
  noteText: {
    textAlign: 'center',
    color: 'white',
    paddingHorizontal: 24,
  },
});

export default Example;
