import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Example from './Example';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Example />
    </SafeAreaProvider>
  );
}

export default App;
