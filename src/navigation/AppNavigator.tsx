// AppNavigator — decides which screen the user sees based on their state:
//
//   not logged in            -> Login screen
//   logged in, no family yet -> Family Setup screen
//   logged in, has a family  -> Home (the real app)
//
// As the user signs in / creates a family, AuthContext updates and this
// automatically swaps to the right screen.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../lib/AuthContext';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import FamilySetupScreen from '../screens/FamilySetupScreen';
import HomeScreen from '../screens/HomeScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import MembersScreen from '../screens/MembersScreen';
import ChartsScreen from '../screens/ChartsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, familyId, loading } = useAuth();

  // While we check the saved session + family on startup, show a spinner.
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
              options={{
                headerShown: true,
                title: 'Add expense',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="Budgets"
              component={BudgetsScreen}
              options={{ headerShown: true, title: 'Budgets' }}
            />
            <Stack.Screen
              name="Members"
              component={MembersScreen}
              options={{ headerShown: true, title: 'Family members' }}
            />
            <Stack.Screen
              name="Charts"
              component={ChartsScreen}
              options={{ headerShown: true, title: 'Charts' }}
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
