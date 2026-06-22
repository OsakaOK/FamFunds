// MonthSwitcher — the  ‹  June 2026  ›  control. Drop it at the top of any data
// screen; it reads/writes the shared MonthContext, so every screen agrees on
// which month is showing.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMonth } from '../lib/MonthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';

export default function MonthSwitcher() {
  const { label, canGoNext, prev, next } = useMonth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.arrowBtn} onPress={prev} hitSlop={8}>
        <Text style={styles.arrow}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={next}
        disabled={!canGoNext}
        hitSlop={8}
      >
        <Text style={[styles.arrow, !canGoNext && styles.arrowDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    },
    arrowBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.chip,
    },
    arrow: { fontSize: 22, fontWeight: '800', color: c.primary, lineHeight: 24 },
    arrowDisabled: { color: c.subtext, opacity: 0.4 },
    label: { fontSize: 16, fontWeight: '700', color: c.text, minWidth: 130, textAlign: 'center' },
  });
