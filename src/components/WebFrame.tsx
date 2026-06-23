// WebFrame — on the WEB only, centers the whole app in a phone-width column
// with neutral "gutters" on the sides, so it looks app-like on a desktop browser
// instead of stretching edge to edge. On phones (mobile web or native) it's a
// no-op: the column just fills the narrow screen.

import { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

const MAX_WIDTH = 480; // a comfortable phone-ish column

export default function WebFrame({ children }: { children: ReactNode }) {
  const { colors, mode } = useTheme();

  if (Platform.OS !== 'web') return <>{children}</>;

  const gutter = mode === 'dark' ? '#000000' : '#d6dae1';

  return (
    <View style={[styles.outer, { backgroundColor: gutter }]}>
      <View style={[styles.column, { backgroundColor: colors.bg }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
});
