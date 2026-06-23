// BudgetsScreen — per-category monthly limits with progress bars. Admins set the
// limits; everyone sees the bars. Auto-carries from the prior month on first touch.

import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useMonth } from '../lib/MonthContext';
import { useToast } from '../lib/ToastContext';
import { Colors, cardShadow } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';
import { ListSkeleton } from '../components/Skeleton';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function BudgetsScreen() {
  const { currentSpaceId, isAdmin } = useAuth();
  const { colors } = useTheme();
  const { range } = useMonth();
  const { showToast } = useToast();
  const navigation = useNavigation<Nav>();
  const styles = makeStyles(colors);

  const [limits, setLimits] = useState<Record<string, number>>({});
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [overallLimit, setOverallLimit] = useState(0);
  const [overallDraft, setOverallDraft] = useState('');
  const [savingOverall, setSavingOverall] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingCat, setSavingCat] = useState<string | null>(null);

  const barColor = (ratio: number) =>
    ratio >= 1 ? colors.danger : ratio >= 0.8 ? colors.warning : colors.success;

  const load = useCallback(async () => {
    if (!currentSpaceId) return;
    await supabase.rpc('ensure_budget_month', { space: currentSpaceId, m: range.start });
    await supabase.rpc('ensure_recurring', { space: currentSpaceId, m: range.start });

    const { data: totalRow } = await supabase
      .from('space_budgets')
      .select('total_limit')
      .eq('space_id', currentSpaceId)
      .eq('month', range.start)
      .maybeSingle();
    setOverallLimit(totalRow ? Number(totalRow.total_limit) : 0);
    setOverallDraft(totalRow ? String(totalRow.total_limit) : '');

    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('category, monthly_limit')
      .eq('space_id', currentSpaceId)
      .eq('month', range.start);

    const limitMap: Record<string, number> = {};
    const draftMap: Record<string, string> = {};
    (budgetRows ?? []).forEach((b) => {
      limitMap[b.category] = Number(b.monthly_limit);
      draftMap[b.category] = String(b.monthly_limit);
    });
    setLimits(limitMap);
    setDrafts(draftMap);

    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('space_id', currentSpaceId)
      .gte('spent_on', range.start)
      .lt('spent_on', range.endExclusive);

    const spentMap: Record<string, number> = {};
    (expenseRows ?? []).forEach((e) => {
      spentMap[e.category] = (spentMap[e.category] ?? 0) + Number(e.amount);
    });
    setSpent(spentMap);
    setLoading(false);
  }, [currentSpaceId, range.start, range.endExclusive]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function saveOverall() {
    const value = Number(overallDraft);
    if (overallDraft.trim() === '' || isNaN(value) || value < 0) {
      showToast('Enter a number of 0 or more', 'error');
      return;
    }
    if (!currentSpaceId) return;

    setSavingOverall(true);
    const { error } = await supabase
      .from('space_budgets')
      .upsert(
        { space_id: currentSpaceId, month: range.start, total_limit: value },
        { onConflict: 'space_id,month' }
      );
    setSavingOverall(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setOverallLimit(value);
    showToast('Monthly budget updated', 'success');
  }

  async function saveLimit(category: string) {
    const value = Number(drafts[category]);
    if (drafts[category] === undefined || isNaN(value) || value < 0) {
      showToast('Enter a number of 0 or more', 'error');
      return;
    }
    if (!currentSpaceId) return;

    setSavingCat(category);
    const { error } = await supabase
      .from('budgets')
      .upsert(
        { space_id: currentSpaceId, category, month: range.start, monthly_limit: value },
        { onConflict: 'space_id,category,month' }
      );
    setSavingCat(null);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setLimits((prev) => ({ ...prev, [category]: value }));
    showToast(`${category} budget updated`, 'success');
  }

  if (loading) return <ListSkeleton rows={6} />;

  const totalSpent = Object.values(spent).reduce((s, n) => s + n, 0);
  const totalRatio = overallLimit > 0 ? totalSpent / overallLimit : 0;
  const totalPct = Math.min(totalRatio, 1) * 100;
  const totalOver = overallLimit > 0 && totalSpent > overallLimit;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Ionicons name="information-circle-outline" size={16} color={colors.subtext} />
        <Text style={styles.introText}>
          Monthly limits. Bars go amber at 80%, red when over.
          {!isAdmin ? ' Only an admin can change them.' : ''}
        </Text>
      </View>

      {/* Overall monthly budget — the headline number shown on Home. */}
      <View style={[styles.card, styles.overallCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.overallTitle}>Overall monthly budget</Text>
          <Text style={[styles.usage, totalOver && { color: colors.danger }]}>
            {overallLimit > 0 ? `${money(totalSpent)} / ${money(overallLimit)}` : `${money(totalSpent)} spent`}
          </Text>
        </View>
        <Text style={styles.overallHint}>The headline "are we okay?" number on your Home screen.</Text>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${totalPct}%`, backgroundColor: barColor(totalRatio) }]} />
        </View>

        {isAdmin && (
          <View style={styles.editRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.limitInput}
              placeholder="Set monthly budget"
              placeholderTextColor={colors.subtext}
              keyboardType="decimal-pad"
              value={overallDraft}
              onChangeText={setOverallDraft}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveOverall} disabled={savingOverall}>
              <Text style={styles.saveBtnText}>{savingOverall ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.sectionLabel}>By category</Text>

      {CATEGORIES.map((category) => {
        const limit = limits[category] ?? 0;
        const used = spent[category] ?? 0;
        const ratio = limit > 0 ? used / limit : 0;
        const pct = Math.min(ratio, 1) * 100;
        const over = limit > 0 && used > limit;

        return (
          <View key={category} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>
                {CATEGORY_EMOJI[category]} {category}
              </Text>
              <Text style={[styles.usage, over && { color: colors.danger }]}>
                {limit > 0 ? `${money(used)} / ${money(limit)}` : `${money(used)} spent`}
              </Text>
            </View>

            <View style={styles.track}>
              <View
                style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor(ratio) }]}
              />
            </View>

            {isAdmin && (
              <View style={styles.editRow}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  style={styles.limitInput}
                  placeholder="Set limit"
                  placeholderTextColor={colors.subtext}
                  keyboardType="decimal-pad"
                  value={drafts[category] ?? ''}
                  onChangeText={(t) => setDrafts((prev) => ({ ...prev, [category]: t }))}
                />
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => saveLimit(category)}
                  disabled={savingCat === category}
                >
                  <Text style={styles.saveBtnText}>
                    {savingCat === category ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.recurringLink}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Recurring')}
      >
        <Ionicons name="repeat" size={18} color={colors.primary} />
        <Text style={styles.recurringLinkText}>Manage recurring charges</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    intro: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, paddingHorizontal: 4 },
    introText: { flex: 1, fontSize: 13, color: c.subtext },
    card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 12, ...cardShadow },
    overallCard: { borderWidth: 1, borderColor: c.primary },
    overallTitle: { fontSize: 16, fontWeight: '800', color: c.text },
    overallHint: { fontSize: 12, color: c.subtext, marginTop: -4, marginBottom: 12 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.subtext,
      marginTop: 4,
      marginBottom: 10,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    category: { fontSize: 16, fontWeight: '700', color: c.text },
    usage: { fontSize: 14, color: c.subtext, fontVariant: ['tabular-nums'] },
    track: { height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    dollar: { fontSize: 16, color: c.subtext, marginRight: 6 },
    limitInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.inputBg,
      fontVariant: ['tabular-nums'],
    },
    saveBtn: {
      marginLeft: 10,
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      minWidth: 76,
      alignItems: 'center',
    },
    saveBtnText: { color: c.primaryText, fontWeight: '700' },
    recurringLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginTop: 4,
      ...cardShadow,
    },
    recurringLinkText: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
  });
