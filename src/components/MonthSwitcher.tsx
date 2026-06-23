// MonthSwitcher —  ‹  June 2026  ›  control. Reads/writes the shared MonthContext
// so every screen agrees on the active month.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMonth } from '../lib/MonthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';

export default function MonthSwitcher() {
  const { label, canGoNext, prev, next } = useMonth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={prev}
        hitSlop={8}
        accessibilityLabel="Previous month"
      >
        <Ionicons name="chevron-back" size={18} color={colors.primary} />
      </TouchableOpacity>

      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={next}
        disabled={!canGoNext}
        hitSlop={8}
        accessibilityLabel="Next month"
      >
        <Ionicons
          name="chevron-forward"
          size={18}
          color={canGoNext ? colors.primary : colors.tabInactive}
        />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
    arrowBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.chip,
    },
    label: { fontSize: 15, fontWeight: '700', color: c.text, minWidth: 124, textAlign: 'center' },
  });
