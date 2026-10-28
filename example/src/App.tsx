import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import E2EScreen from './e2e/E2EScreen';
import Example from './Example';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {process.env.EXPO_PUBLIC_E2E === '1' ? <E2EScreen /> : <Example />}
    </SafeAreaProvider>
  );
}

export default App;
