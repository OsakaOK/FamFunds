// HomeScreen — the live family expense feed for the current month.
// Shows the monthly total at the top, then each expense (who, what, when),
// and a "+" button to add a new one. Re-loads every time you return to it.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { CATEGORY_EMOJI } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Expense = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  spent_on: string;
};

// First day of the current month as YYYY-MM-DD.
function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function HomeScreen({ navigation }: Props) {
  const { user, familyId, signOut } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!familyId) return;

    // 1. This month's expenses for the family, newest first.
    const { data, error } = await supabase
      .from('expenses')
      .select('id, user_id, amount, category, note, spent_on')
      .eq('family_id', familyId)
      .gte('spent_on', startOfMonth())
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not load expenses:', error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Expense[];
    setExpenses(rows);

    // 2. Look up the display name for each person who logged an expense.
    const ids = [...new Set(rows.map((e) => e.user_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', ids);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p) => {
        map[p.id] = p.full_name || p.email || 'Member';
      });
      setNames(map);
    }
    setLoading(false);
  }, [familyId]);

  // Re-load whenever this screen comes into focus (e.g. after adding an expense).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  function whoLabel(userId: string) {
    if (userId === user?.id) return 'You';
    return names[userId] ?? 'Member';
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with monthly total */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>This month</Text>
          <Text style={styles.headerTotal}>{money(monthTotal)}</Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>
                Tap the + button to log your first one.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.emoji}>{CATEGORY_EMOJI[item.category] ?? '📦'}</Text>
              <View style={styles.rowMiddle}>
                <Text style={styles.rowCategory}>{item.category}</Text>
                <Text style={styles.rowMeta}>
                  {whoLabel(item.user_id)} · {item.spent_on}
                  {item.note ? ` · ${item.note}` : ''}
                </Text>
              </View>
              <Text style={styles.rowAmount}>{money(Number(item.amount))}</Text>
            </View>
          )}
        />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerLabel: { fontSize: 14, color: '#6b7280' },
  headerTotal: { fontSize: 34, fontWeight: '800', color: '#111827', marginTop: 2 },
  signOut: { color: '#ef4444', fontSize: 14, fontWeight: '600', marginTop: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  emoji: { fontSize: 24, marginRight: 12 },
  rowMiddle: { flex: 1 },
  rowCategory: { fontSize: 16, fontWeight: '700', color: '#111827' },
  rowMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  rowAmount: { fontSize: 17, fontWeight: '800', color: '#111827' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36 },
});
