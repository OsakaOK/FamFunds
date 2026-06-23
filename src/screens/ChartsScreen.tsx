// ChartsScreen — visual breakdown of the SELECTED month's spending.
//   * Pie/donut chart: each category's share of the total (drawn with SVG).
//   * Bar list: spend per category, largest first.
// The month switcher stays visible even when a month has no data.

import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { G, Path, Circle } from 'react-native-svg';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useMonth } from '../lib/MonthContext';
import { Colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { CATEGORY_COLOR, CATEGORY_EMOJI } from '../lib/categories';
import MonthSwitcher from '../components/MonthSwitcher';

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

type Slice = { category: string; total: number };

export default function ChartsScreen() {
  const { currentSpaceId } = useAuth();
  const { colors } = useTheme();
  const { range } = useMonth();
  const styles = makeStyles(colors);

  const [slices, setSlices] = useState<Slice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentSpaceId) return;
    setLoading(true);

    const { data } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('space_id', currentSpaceId)
      .gte('spent_on', range.start)
      .lt('spent_on', range.endExclusive);

    const byCategory: Record<string, number> = {};
    let sum = 0;
    (data ?? []).forEach((e) => {
      const amt = Number(e.amount);
      byCategory[e.category] = (byCategory[e.category] ?? 0) + amt;
      sum += amt;
    });

    const built = Object.entries(byCategory)
      .map(([category, t]) => ({ category, total: t }))
      .sort((a, b) => b.total - a.total);

    setSlices(built);
    setTotal(sum);
    setLoading(false);
  }, [currentSpaceId, range.start, range.endExclusive]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const size = 220;
  const radius = size / 2;
  let angle = 0;
  const maxBar = slices.length ? Math.max(...slices.map((s) => s.total)) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <MonthSwitcher />

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : total === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No spending this month</Text>
          <Text style={styles.emptyText}>Add expenses, or step to another month above.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.total}>{money(total)}</Text>

          <View style={styles.pieWrap}>
            <Svg width={size} height={size}>
              <G>
                {slices.map((s) => {
                  const sweep = (s.total / total) * 360;
                  const path = slicePath(radius, radius, radius, angle, angle + sweep);
                  angle += sweep;
                  return (
                    <Path key={s.category} d={path} fill={CATEGORY_COLOR[s.category] ?? '#9ca3af'} />
                  );
                })}
                <Circle cx={radius} cy={radius} r={radius * 0.55} fill={colors.bg} />
              </G>
            </Svg>
          </View>

          <Text style={styles.sectionTitle}>By category</Text>
          {slices.map((s) => {
            const pct = total > 0 ? (s.total / total) * 100 : 0;
            const barWidth = maxBar > 0 ? (s.total / maxBar) * 100 : 0;
            const color = CATEGORY_COLOR[s.category] ?? '#9ca3af';
            return (
              <View key={s.category} style={styles.barRow}>
                <View style={styles.barHeader}>
                  <Text style={styles.barLabel}>
                    {CATEGORY_EMOJI[s.category]} {s.category}
                  </Text>
                  <Text style={styles.barAmount}>
                    {money(s.total)} · {pct.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${barWidth}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    total: {
      fontSize: 34,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    pieWrap: { alignItems: 'center', marginVertical: 16 },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      marginTop: 12,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    barRow: { backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10 },
    barHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    barLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    barAmount: { fontSize: 14, color: c.subtext },
    track: { height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 14, color: c.subtext, marginTop: 6, textAlign: 'center' },
  });
