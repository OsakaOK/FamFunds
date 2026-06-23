// AppNavigator — decides which screen the user sees based on their state:
//
//   not logged in            -> Login screen
//   logged in, no family yet -> Family Setup screen
//   logged in, has a family  -> Home + the inner app screens
//
// It also applies the current light/dark theme to the navigation bars,
// status bar, and screen background.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SpacesScreen from '../screens/SpacesScreen';
import RecurringScreen from '../screens/RecurringScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { mode, colors } = useTheme();

  // Theme the React Navigation chrome (headers, backgrounds).
  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.headerBg,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Default header look for the inner screens.
  const headerOptions = {
    headerShown: true as const,
    headerStyle: { backgroundColor: colors.headerBg },
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{ ...headerOptions, title: 'Add expense', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ ...headerOptions, title: 'Settings' }}
            />
            <Stack.Screen
              name="Spaces"
              component={SpacesScreen}
              options={{ ...headerOptions, title: 'Spaces' }}
            />
            <Stack.Screen
              name="Recurring"
              component={RecurringScreen}
              options={{ ...headerOptions, title: 'Recurring charges' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
