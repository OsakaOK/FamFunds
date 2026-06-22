// App.tsx — the root of the app. It wraps everything in:
//   SafeAreaProvider  -> respects phone notches / status bars
//   AuthProvider      -> makes "who is logged in" available everywhere
//   AppNavigator      -> shows the right screen for the user's state

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
