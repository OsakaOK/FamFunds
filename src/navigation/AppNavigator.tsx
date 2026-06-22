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
import FamilySetupScreen from '../screens/FamilySetupScreen';
import HomeScreen from '../screens/HomeScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import MembersScreen from '../screens/MembersScreen';
import ChartsScreen from '../screens/ChartsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, familyId, loading } = useAuth();
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
        ) : !familyId ? (
          <Stack.Screen name="FamilySetup" component={FamilySetupScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{ ...headerOptions, title: 'Add expense', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Budgets"
              component={BudgetsScreen}
              options={{ ...headerOptions, title: 'Budgets' }}
            />
            <Stack.Screen
              name="Members"
              component={MembersScreen}
              options={{ ...headerOptions, title: 'Family members' }}
            />
            <Stack.Screen
              name="Charts"
              component={ChartsScreen}
              options={{ ...headerOptions, title: 'Charts' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ ...headerOptions, title: 'Settings' }}
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
