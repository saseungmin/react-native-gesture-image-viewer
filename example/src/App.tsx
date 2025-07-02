import { useCallback, useState } from 'react';
import { Button, FlatList, Image, Modal, SafeAreaView, StyleSheet, View } from 'react-native';
import { GestureImageViewer } from 'react-native-gesture-image-viewer';

function App() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = [
    'https://picsum.photos/400/200',
    'https://picsum.photos/300/200',
    'https://picsum.photos/200/200',
    'https://picsum.photos/200/300',
    'https://picsum.photos/200/400',
  ];

  const renderImage = useCallback((imageUrl: string) => {
    return <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Button title="Open" onPress={() => setVisible(true)} />
      <Modal visible={visible} onRequestClose={() => setVisible(false)}>
        <GestureImageViewer
          data={images}
          initialIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          onDismiss={() => setVisible(false)}
          ListComponent={FlatList}
          renderImage={renderImage}
          renderContainer={(children) => <View style={{ flex: 1 }}>{children}</View>}
        />
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
