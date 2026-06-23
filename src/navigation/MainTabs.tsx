// MainTabs — the bottom tab bar (Home · Charts · Budgets · Members) shown once
// you're signed in. All four tabs share the AppHeader top bar. Add Expense,
// Settings, and Spaces live in the parent stack (opened over the tabs).

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../lib/ThemeContext';
import { TabParamList } from './types';
import AppHeader from './AppHeader';
import HomeScreen from '../screens/HomeScreen';
import ChartsScreen from '../screens/ChartsScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import MembersScreen from '../screens/MembersScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, [string, string]> = {
  // [focused, unfocused]
  Home: ['home', 'home-outline'],
  Charts: ['pie-chart', 'pie-chart-outline'],
  Budgets: ['wallet', 'wallet-outline'],
  Members: ['people', 'people-outline'],
};

export default function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <AppHeader />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.headerBg,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const [on, off] = ICONS[route.name];
          return <Ionicons name={(focused ? on : off) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Charts" component={ChartsScreen} />
      <Tab.Screen name="Budgets" component={BudgetsScreen} />
      <Tab.Screen name="Members" component={MembersScreen} />
    </Tab.Navigator>
  );
}
