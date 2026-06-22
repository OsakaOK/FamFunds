// HomeScreen — the SELECTED month's expenses, grouped by category with subtotals.
// Tap a category header to collapse/expand. Tap one of YOUR OWN rows to edit it.
// Month switcher + total live in the header; "+" adds a new expense.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useMonth } from '../lib/MonthContext';
import { Colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { CATEGORY_EMOJI } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';
import MonthSwitcher from '../components/MonthSwitcher';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  spent_on: string;
};

type Group = { category: string; total: number; items: Expense[] };

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function HomeScreen({ navigation }: Props) {
  const { user, familyId } = useAuth();
  const { colors } = useTheme();
  const { range } = useMonth();
  const styles = makeStyles(colors);

  const [groups, setGroups] = useState<Group[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!familyId) return;

    const { data, error } = await supabase
      .from('expenses')
      .select('id, user_id, amount, category, note, spent_on')
      .eq('family_id', familyId)
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

    const ids = [...new Set(rows.map((e) => e.user_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', ids);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p) => {
        nameMap[p.id] = p.full_name || p.email || 'Member';
      });
      setNames(nameMap);
    }
    setLoading(false);
  }, [familyId, range.start, range.endExclusive]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const monthTotal = groups.reduce((sum, g) => sum + g.total, 0);

  function whoLabel(userId: string) {
    if (userId === user?.id) return 'You';
    return names[userId] ?? 'Member';
  }

  function toggle(category: string) {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.linkRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Charts')}>
            <Text style={styles.navLink}>Charts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Members')}>
            <Text style={styles.navLink}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
            <Text style={styles.navLink}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.navLink}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthRow}>
          <MonthSwitcher />
        </View>
        <Text style={styles.headerTotal}>{money(monthTotal)}</Text>
        <Text style={styles.headerCaption}>total spent</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />
          }
        >
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No expenses this month</Text>
              <Text style={styles.emptyText}>
                Tap the + button, or step to another month above.
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
                      {isCollapsed ? '▸' : '▾'} {CATEGORY_EMOJI[g.category] ?? '📦'} {g.category}
                    </Text>
                    <Text style={styles.groupTotal}>{money(g.total)}</Text>
                  </TouchableOpacity>

                  {!isCollapsed &&
                    g.items.map((item) => {
                      const mine = item.user_id === user?.id;
                      const body = (
                        <>
                          <View style={styles.rowMiddle}>
                            <Text style={styles.rowWho}>
                              {whoLabel(item.user_id)}
                              {mine ? ' ✎' : ''}
                            </Text>
                            <Text style={styles.rowMeta}>
                              {item.spent_on}
                              {item.note ? ` · ${item.note}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.rowAmount}>{money(Number(item.amount))}</Text>
                        </>
                      );
                      return mine ? (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.row}
                          activeOpacity={0.6}
                          onPress={() =>
                            navigation.navigate('AddExpense', { expenseId: item.id })
                          }
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

      {/* Floating Add button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 18,
      backgroundColor: c.headerBg,
    },
    linkRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: 16,
    },
    navLink: { color: c.primary, fontSize: 14, fontWeight: '700' },
    monthRow: { marginTop: 14 },
    headerTotal: { fontSize: 34, fontWeight: '800', color: c.text, textAlign: 'center', marginTop: 10 },
    headerCaption: { fontSize: 13, color: c.subtext, textAlign: 'center', marginTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16, paddingBottom: 100 },
    group: { backgroundColor: c.card, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    groupTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    groupTotal: { fontSize: 16, fontWeight: '800', color: c.text },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    rowMiddle: { flex: 1 },
    rowWho: { fontSize: 15, fontWeight: '600', color: c.text },
    rowMeta: { fontSize: 13, color: c.subtext, marginTop: 2 },
    rowAmount: { fontSize: 16, fontWeight: '700', color: c.text },
    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 14, color: c.subtext, marginTop: 6, textAlign: 'center' },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 32,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    fabText: { color: c.primaryText, fontSize: 32, fontWeight: '300', lineHeight: 36 },
  });
