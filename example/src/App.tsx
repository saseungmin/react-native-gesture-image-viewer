import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { multiply } from 'react-native-gesture-image-viewer';

const result = multiply(3, 7);

export default function App() {
  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        <Text>Result: {result}</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
