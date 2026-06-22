// BudgetsScreen — set a monthly spending limit per category and see how much of
// it you've used this month. The bar goes green -> amber -> red as you approach
// and exceed the limit.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/categories';

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// Pick a bar colour from how much of the limit is used (0–1+).
function barColor(ratio: number) {
  if (ratio >= 1) return '#ef4444'; // red — over budget
  if (ratio >= 0.8) return '#f59e0b'; // amber — getting close
  return '#22c55e'; // green — healthy
}

export default function BudgetsScreen() {
  const { familyId } = useAuth();

  const [limits, setLimits] = useState<Record<string, number>>({});
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // text in each input
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!familyId) return;

    // Budgets already set for this family.
    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('category, monthly_limit')
      .eq('family_id', familyId);

    const limitMap: Record<string, number> = {};
    const draftMap: Record<string, string> = {};
    (budgetRows ?? []).forEach((b) => {
      limitMap[b.category] = Number(b.monthly_limit);
      draftMap[b.category] = String(b.monthly_limit);
    });
    setLimits(limitMap);
    setDrafts(draftMap);

    // This month's spending, summed per category.
    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('family_id', familyId)
      .gte('spent_on', startOfMonth());

    const spentMap: Record<string, number> = {};
    (expenseRows ?? []).forEach((e) => {
      spentMap[e.category] = (spentMap[e.category] ?? 0) + Number(e.amount);
    });
    setSpent(spentMap);
    setLoading(false);
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function saveLimit(category: string) {
    const value = Number(drafts[category]);
    if (drafts[category] === undefined || isNaN(value) || value < 0) {
      Alert.alert('Check the amount', 'Enter a number of 0 or more.');
      return;
    }
    if (!familyId) return;

    setSavingCat(category);
    const { error } = await supabase
      .from('budgets')
      .upsert(
        { family_id: familyId, category, monthly_limit: value },
        { onConflict: 'family_id,category' }
      );
    setSavingCat(null);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setLimits((prev) => ({ ...prev, [category]: value }));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Set a monthly limit for each category. Bars turn amber at 80% and red when
        you go over.
      </Text>

      {CATEGORIES.map((category) => {
        const limit = limits[category] ?? 0;
        const used = spent[category] ?? 0;
        const ratio = limit > 0 ? used / limit : 0;
        const pct = Math.min(ratio, 1) * 100;

        return (
          <View key={category} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>
                {CATEGORY_EMOJI[category]} {category}
              </Text>
              <Text style={styles.usage}>
                {limit > 0 ? `${money(used)} / ${money(limit)}` : `${money(used)} spent`}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: barColor(ratio) },
                ]}
              />
            </View>

            {/* Limit editor */}
            <View style={styles.editRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={styles.limitInput}
                placeholder="Set limit"
                keyboardType="decimal-pad"
                value={drafts[category] ?? ''}
                onChangeText={(t) =>
                  setDrafts((prev) => ({ ...prev, [category]: t }))
                }
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => saveLimit(category)}
                disabled={savingCat === category}
              >
                {savingCat === category ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  intro: { fontSize: 14, color: '#6b7280', marginBottom: 16, paddingHorizontal: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  category: { fontSize: 16, fontWeight: '700', color: '#111827' },
  usage: { fontSize: 14, color: '#6b7280' },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  dollar: { fontSize: 16, color: '#6b7280', marginRight: 6 },
  limitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  saveBtn: {
    marginLeft: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
