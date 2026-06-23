// HomeScreen — the active month's expenses for the current Space, grouped by
// category with subtotals (collapsible). The Space switcher / month stepper live
// in the shared top bar now, so this screen is just: total summary + feed + FAB.
// Tap a row you can edit (your own, or any as admin) to edit it.

import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useMonth } from '../lib/MonthContext';
import { Colors, cardShadow } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { CATEGORY_EMOJI } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';
import { ListSkeleton } from '../components/Skeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Expense = {
  id: string;
  user_id: string;
  logger_name: string | null;
  amount: number;
  category: string;
  note: string | null;
  spent_on: string;
  recurring_id: string | null;
};

type Group = { category: string; total: number; items: Expense[] };

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { userId, currentSpaceId, isAdmin } = useAuth();
  const { colors } = useTheme();
  const { range, label } = useMonth();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = makeStyles(colors);

  const [groups, setGroups] = useState<Group[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [totalBudget, setTotalBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentSpaceId) return;

    // Make sure recurring charges + the overall budget exist for this month.
    await supabase.rpc('ensure_budget_month', { space: currentSpaceId, m: range.start });
    await supabase.rpc('ensure_recurring', { space: currentSpaceId, m: range.start });

    // The overall monthly budget — the headline "are we okay?" number.
    const { data: tb } = await supabase
      .from('space_budgets')
      .select('total_limit')
      .eq('space_id', currentSpaceId)
      .eq('month', range.start)
      .maybeSingle();
    setTotalBudget(tb ? Number(tb.total_limit) : null);

    const { data, error } = await supabase
      .from('expenses')
      .select('id, user_id, logger_name, amount, category, note, spent_on, recurring_id')
      .eq('space_id', currentSpaceId)
      .gte('spent_on', range.start)
      .lt('spent_on', range.endExclusive)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not load expenses:', error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Expense[];
    const map: Record<string, Group> = {};
    rows.forEach((e) => {
      if (!map[e.category]) map[e.category] = { category: e.category, total: 0, items: [] };
      map[e.category].total += Number(e.amount);
      map[e.category].items.push(e);
    });
    setGroups(Object.values(map).sort((a, b) => b.total - a.total));
    setLoading(false);
  }, [currentSpaceId, range.start, range.endExclusive]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const monthTotal = groups.reduce((sum, g) => sum + g.total, 0);
  const count = groups.reduce((n, g) => n + g.items.length, 0);

  // Budget-health "coach" numbers for the headline card.
  const hasBudget = totalBudget !== null && totalBudget > 0;
  const ratio = hasBudget ? monthTotal / (totalBudget as number) : 0;
  const pct = Math.min(ratio, 1) * 100;
  const over = hasBudget && monthTotal > (totalBudget as number);
  const remaining = hasBudget ? (totalBudget as number) - monthTotal : 0;
  const barColor = ratio >= 1 ? colors.danger : ratio >= 0.8 ? colors.warning : colors.success;

  function whoLabel(e: Expense) {
    if (e.user_id === userId) return 'You';
    return e.logger_name || 'Former member';
  }
  const canEdit = (e: Expense) => e.user_id === userId || isAdmin;
  const toggle = (c: string) => setCollapsed((p) => ({ ...p, [c]: !p[c] }));

  return (
    <View style={styles.container}>
      {loading ? (
        <ListSkeleton rows={6} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 96 }]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />
          }
        >
          {/* Budget-health headline — the "are we okay this month?" answer. */}
          <View style={styles.coach}>
            {hasBudget ? (
              <>
                <View style={styles.coachTop}>
                  <Text style={styles.coachLabel}>{label} budget</Text>
                  <Text style={[styles.coachPct, { color: barColor }]}>
                    {Math.round(ratio * 100)}%
                  </Text>
                </View>
                <Text style={styles.coachAmount}>
                  {money(monthTotal)}{' '}
                  <Text style={styles.coachOf}>of {money(totalBudget as number)}</Text>
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.coachFoot, { color: over ? colors.danger : colors.subtext }]}>
                  {over
                    ? `Over budget by ${money(monthTotal - (totalBudget as number))}`
                    : `${money(remaining)} left this month`}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.coachLabel}>Total spent · {label}</Text>
                <Text style={styles.coachAmount}>{money(monthTotal)}</Text>
                <Text style={styles.coachSub}>
                  {count} {count === 1 ? 'expense' : 'expenses'}
                </Text>
                {isAdmin ? (
                  <TouchableOpacity
                    style={styles.coachCta}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('Budgets' as never)}
                  >
                    <Ionicons name="flag-outline" size={15} color={colors.primary} />
                    <Text style={styles.coachCtaText}>
                      Set a monthly budget to see if you're on track
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.coachCta}>
                    <Ionicons name="information-circle-outline" size={15} color={colors.subtext} />
                    <Text style={[styles.coachCtaText, { color: colors.subtext }]}>
                      No monthly budget set yet
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={44} color={colors.tabInactive} />
              <Text style={styles.emptyTitle}>No expenses this month</Text>
              <Text style={styles.emptyText}>
                Tap the ＋ button, or step to another month up top.
              </Text>
            </View>
          ) : (
            groups.map((g) => {
              const isCollapsed = collapsed[g.category];
              return (
                <View key={g.category} style={styles.group}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggle(g.category)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groupTitle}>
                      {CATEGORY_EMOJI[g.category] ?? '📦'} {g.category}
                    </Text>
                    <View style={styles.groupRight}>
                      <Text style={styles.groupTotal}>{money(g.total)}</Text>
                      <Ionicons
                        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={16}
                        color={colors.subtext}
                      />
                    </View>
                  </TouchableOpacity>

                  {!isCollapsed &&
                    g.items.map((item) => {
                      const editable = canEdit(item);
                      const body = (
                        <>
                          <View style={styles.rowMiddle}>
                            <View style={styles.rowWhoLine}>
                              <Text style={styles.rowWho}>{whoLabel(item)}</Text>
                              {editable && (
                                <Ionicons name="pencil" size={11} color={colors.tabInactive} />
                              )}
                              {item.recurring_id && (
                                <View style={styles.recurringTag}>
                                  <Ionicons name="repeat" size={10} color={colors.primary} />
                                  <Text style={styles.recurringTagText}>Recurring</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.rowMeta}>
                              {item.spent_on}
                              {item.note ? ` · ${item.note}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.rowAmount}>{money(Number(item.amount))}</Text>
                        </>
                      );
                      return editable ? (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.row}
                          activeOpacity={0.6}
                          onPress={() => navigation.navigate('AddExpense', { expenseId: item.id })}
                        >
                          {body}
                        </TouchableOpacity>
                      ) : (
                        <View key={item.id} style={styles.row}>
                          {body}
                        </View>
                      );
                    })}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + 16 }]}
        onPress={() => navigation.navigate('AddExpense')}
        activeOpacity={0.85}
        accessibilityLabel="Add expense"
      >
        <Ionicons name="add" size={32} color={colors.primaryText} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    list: { padding: 16 },
    coach: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      ...cardShadow,
    },
    coachTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    coachLabel: { fontSize: 13, color: c.subtext, fontWeight: '700' },
    coachPct: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    coachAmount: {
      fontSize: 34,
      fontWeight: '800',
      color: c.text,
      marginTop: 6,
      fontVariant: ['tabular-nums'],
    },
    coachOf: { fontSize: 17, fontWeight: '600', color: c.subtext },
    track: { height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden', marginTop: 14 },
    fill: { height: '100%', borderRadius: 5 },
    coachFoot: { fontSize: 13, fontWeight: '700', marginTop: 10, fontVariant: ['tabular-nums'] },
    coachSub: { fontSize: 13, color: c.subtext, marginTop: 2 },
    coachCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    coachCtaText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.primary },
    group: { backgroundColor: c.card, borderRadius: 14, marginBottom: 12, overflow: 'hidden', ...cardShadow },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    groupTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    groupRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    groupTotal: { fontSize: 16, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    rowMiddle: { flex: 1 },
    rowWhoLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rowWho: { fontSize: 15, fontWeight: '600', color: c.text },
    recurringTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.accentBg,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    recurringTagText: { fontSize: 10, fontWeight: '700', color: c.primary },
    rowMeta: { fontSize: 13, color: c.subtext, marginTop: 2 },
    rowAmount: { fontSize: 16, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24, gap: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 14, color: c.subtext, textAlign: 'center' },
    fab: {
      position: 'absolute',
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
