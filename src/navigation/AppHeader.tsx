// AppHeader — the slim top bar shared across all bottom-tab screens. Holds the
// Space switcher (left, → Spaces), a Settings gear (right, → Settings), and the
// month stepper beneath. This replaces the old cramped per-screen header.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';
import { RootStackParamList } from './types';
import MonthSwitcher from '../components/MonthSwitcher';

export default function AppHeader() {
  const { currentSpace } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const styles = makeStyles(colors);

  const isPersonal = currentSpace?.kind === 'personal';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.spaceBtn}
          onPress={() => navigation.navigate('Spaces')}
          accessibilityLabel="Switch space"
        >
          <Ionicons
            name={isPersonal ? 'lock-closed' : 'people'}
            size={16}
            color={colors.primary}
          />
          <Text style={styles.spaceName} numberOfLines={1}>
            {currentSpace?.name ?? 'Space'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.subtext} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.monthRow}>
        <MonthSwitcher />
      </View>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.headerBg,
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    spaceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingRight: 8,
      flexShrink: 1,
    },
    spaceName: { fontSize: 16, fontWeight: '800', color: c.text, maxWidth: 200 },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    monthRow: { marginTop: 6 },
  });
