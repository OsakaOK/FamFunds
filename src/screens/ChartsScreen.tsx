// ChartsScreen — visual breakdown of this month's spending.
//   * Pie chart: each category's share of the total (drawn with SVG).
//   * Bar list: spend per category, largest first.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { G, Path, Circle } from 'react-native-svg';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { CATEGORY_COLOR, CATEGORY_EMOJI } from '../lib/categories';

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// --- SVG pie helpers --------------------------------------------------------
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// Build the SVG path for one pie slice between two angles.
function slicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

type Slice = { category: string; total: number };

export default function ChartsScreen() {
  const { familyId } = useAuth();

  const [slices, setSlices] = useState<Slice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!familyId) return;

    const { data } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('family_id', familyId)
      .gte('spent_on', startOfMonth());

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
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (total === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No spending yet this month</Text>
        <Text style={styles.emptyText}>Add some expenses to see the charts.</Text>
      </View>
    );
  }

  // Pie geometry.
  const size = 220;
  const radius = size / 2;
  let angle = 0;
  const maxBar = Math.max(...slices.map((s) => s.total));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.totalLabel}>This month</Text>
      <Text style={styles.total}>{money(total)}</Text>

      {/* Pie chart */}
      <View style={styles.pieWrap}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((s) => {
              const sweep = (s.total / total) * 360;
              const path = slicePath(radius, radius, radius, angle, angle + sweep);
              angle += sweep;
              return (
                <Path
                  key={s.category}
                  d={path}
                  fill={CATEGORY_COLOR[s.category] ?? '#9ca3af'}
                />
              );
            })}
            {/* donut hole */}
            <Circle cx={radius} cy={radius} r={radius * 0.55} fill="#fff" />
          </G>
        </Svg>
      </View>

      {/* Bar list */}
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
              <View
                style={[styles.fill, { width: `${barWidth}%`, backgroundColor: color }]}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  totalLabel: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  total: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  pieWrap: { alignItems: 'center', marginVertical: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  barRow: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  barAmount: { fontSize: 14, color: '#6b7280' },
  track: { height: 10, borderRadius: 5, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
});
