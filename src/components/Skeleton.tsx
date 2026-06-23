// Skeleton — a gently pulsing placeholder shown while data loads, so screens
// don't flash a bare spinner. Compose the primitives into screen-specific
// loading layouts (see ListSkeleton below).

import { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.chip, opacity: pulse }, style]}
    />
  );
}

// A few card rows, for list-style screens (feed, budgets, members).
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.card }]}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={styles.body}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={11} style={{ marginTop: 8 }} />
          </View>
          <Skeleton width={56} height={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 16,
  },
  body: { flex: 1 },
});
