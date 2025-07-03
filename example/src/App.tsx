import { useCallback, useState } from 'react';
import { Button, FlatList, Image, Modal, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { GestureImageViewer, useImageViewerController } from 'react-native-gesture-image-viewer';

const images = [
  'https://picsum.photos/400/200',
  'https://picsum.photos/300/200',
  'https://picsum.photos/200/200',
  'https://picsum.photos/200/300',
  'https://picsum.photos/200/400',
];

function App() {
  const [visible, setVisible] = useState(false);

  const { goToIndex, goToPrevious, goToNext, currentIndex, totalCount } = useImageViewerController();

  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Open" onPress={() => setVisible(true)} />
      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1 }}>
          <GestureImageViewer
            data={images}
            onDismiss={() => setVisible(false)}
            ListComponent={FlatList}
            renderImage={renderImage}
            renderContainer={(children) => <View style={{ flex: 1 }}>{children}</View>}
          />
          <View style={{ position: 'absolute', bottom: 20, left: 0, right: 0, gap: 10, flexDirection: 'column' }}>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
              <Button title="Go to previous" onPress={goToPrevious} />
              <Button title="Go to index 2" onPress={() => goToIndex(2)} />
              <Button title="Go to next" onPress={goToNext} />
            </View>
            <Text style={{ textAlign: 'center', color: 'white' }}>{`${currentIndex + 1} / ${totalCount}`}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
