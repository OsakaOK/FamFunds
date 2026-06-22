// App.tsx — the root of the app. Providers wrap everything:
//   SafeAreaProvider  -> respects phone notches / status bars
//   ThemeProvider     -> light/dark colors available everywhere
//   AuthProvider      -> who is logged in + their family
//   AppNavigator      -> shows the right screen for the user's state

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/lib/ThemeContext';
import { AuthProvider } from './src/lib/AuthContext';
import { MonthProvider } from './src/lib/MonthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <MonthProvider>
            <AppNavigator />
          </MonthProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
