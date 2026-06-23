// RecurringScreen — manage recurring charges (rent, subscriptions, phone bill).
// Each active template auto-appears as an expense once per month, so fixed costs
// aren't invisible. You can add your own; edit/remove your own (admins: any).
// Reached from the Budgets screen.

import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useMonth } from '../lib/MonthContext';
import { useToast } from '../lib/ToastContext';
import { Colors, cardShadow } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { CATEGORIES, CATEGORY_EMOJI, Category } from '../lib/categories';
import { ListSkeleton } from '../components/Skeleton';

type Recurring = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  active: boolean;
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

// Cross-platform confirm (react-native-web's Alert doesn't show buttons).
function confirmRemove(onYes: () => void) {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm?.('Remove this recurring charge? Past months stay; it just stops going forward.')) {
      onYes();
    }
  } else {
    Alert.alert('Remove recurring charge?', 'Past months stay; it just stops going forward.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onYes },
    ]);
  }
}

export default function RecurringScreen() {
  const { userId, currentSpaceId, displayName, isAdmin } = useAuth();
  const { colors } = useTheme();
  const { range } = useMonth();
  const { showToast } = useToast();
  const styles = makeStyles(colors);

  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);

  // New-charge form.
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!currentSpaceId) return;
    const { data } = await supabase
      .from('recurring_expenses')
      .select('id, user_id, amount, category, note, active')
      .eq('space_id', currentSpaceId)
      .order('created_at', { ascending: true });
    setItems((data ?? []) as Recurring[]);
    setLoading(false);
  }, [currentSpaceId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function addCharge() {
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      showToast('Enter an amount greater than 0', 'error');
      return;
    }
    if (!note.trim()) {
      showToast('Give it a name, e.g. "Rent"', 'error');
      return;
    }
    if (!userId || !currentSpaceId) return;

    setSaving(true);
    const { error } = await supabase.from('recurring_expenses').insert({
      space_id: currentSpaceId,
      user_id: userId,
      logger_name: displayName,
      amount: value,
      category,
      note: note.trim(),
    });
    if (error) {
      setSaving(false);
      showToast(error.message, 'error');
      return;
    }
    // Materialise it into the month you're viewing right away (if eligible).
    await supabase.rpc('ensure_recurring', { space: currentSpaceId, m: range.start });
    setSaving(false);
    setAmount('');
    setNote('');
    setCategory('Other');
    showToast('Recurring charge added', 'success');
    load();
  }

  async function toggleActive(item: Recurring) {
    const { error } = await supabase
      .from('recurring_expenses')
      .update({ active: !item.active })
      .eq('id', item.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    if (!item.active && currentSpaceId) {
      // Re-activating: backfill the month you're viewing.
      await supabase.rpc('ensure_recurring', { space: currentSpaceId, m: range.start });
    }
    showToast(item.active ? 'Paused' : 'Resumed', 'success');
    load();
  }

  function removeCharge(item: Recurring) {
    confirmRemove(async () => {
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', item.id);
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Recurring charge removed', 'success');
      load();
    });
  }

  const canManage = (item: Recurring) => item.user_id === userId || isAdmin;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Ionicons name="repeat" size={16} color={colors.subtext} />
        <Text style={styles.introText}>
          Fixed monthly costs auto-appear as an expense each month — so rent and
          subscriptions count toward your budget without re-typing them.
        </Text>
      </View>

      {/* Add form */}
      <View style={styles.card}>
        <Text style={styles.formTitle}>Add a recurring charge</Text>

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.subtext}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!saving}
          />
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(c)}
                activeOpacity={0.8}
                disabled={saving}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {CATEGORY_EMOJI[c]} {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "Rent", "Netflix", "Phone bill"'
          placeholderTextColor={colors.subtext}
          value={note}
          onChangeText={setNote}
          editable={!saving}
        />

        <TouchableOpacity
          style={[styles.addBtn, saving && { opacity: 0.6 }]}
          onPress={addCharge}
          disabled={saving}
        >
          <Ionicons name="add" size={18} color={colors.primaryText} />
          <Text style={styles.addBtnText}>{saving ? 'Adding…' : 'Add recurring charge'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Your recurring charges</Text>

      {loading ? (
        <ListSkeleton rows={3} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="repeat-outline" size={40} color={colors.tabInactive} />
          <Text style={styles.emptyText}>No recurring charges yet.</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={[styles.row, !item.active && { opacity: 0.55 }]}>
            <Text style={styles.rowEmoji}>{CATEGORY_EMOJI[item.category] ?? '📦'}</Text>
            <View style={styles.rowMiddle}>
              <Text style={styles.rowName}>{item.note || item.category}</Text>
              <Text style={styles.rowMeta}>
                {item.category}
                {!item.active ? ' · paused' : ''}
              </Text>
            </View>
            <Text style={styles.rowAmount}>{money(Number(item.amount))}</Text>

            {canManage(item) && (
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => toggleActive(item)}
                  hitSlop={8}
                  accessibilityLabel={item.active ? 'Pause' : 'Resume'}
                >
                  <Ionicons
                    name={item.active ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={22}
                    color={colors.subtext}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeCharge(item)} hitSlop={8} accessibilityLabel="Remove">
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    intro: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 14, paddingHorizontal: 4 },
    introText: { flex: 1, fontSize: 13, color: c.subtext, lineHeight: 18 },
    card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 20, ...cardShadow },
    formTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 4 },
    label: { fontSize: 13, fontWeight: '700', color: c.subtext, marginTop: 16, marginBottom: 8 },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      backgroundColor: c.inputBg,
    },
    currency: { fontSize: 20, color: c.subtext, fontWeight: '700' },
    amountInput: {
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: c.text,
      paddingVertical: 10,
      marginLeft: 6,
      fontVariant: ['tabular-nums'],
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.inputBg,
    },
    chipActive: { borderColor: c.primary, backgroundColor: c.accentBg },
    chipText: { fontSize: 13, color: c.subtext, fontWeight: '600' },
    chipTextActive: { color: c.primary, fontWeight: '800' },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      marginTop: 22,
    },
    addBtnText: { color: c.primaryText, fontSize: 15, fontWeight: '700' },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.subtext,
      marginBottom: 10,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    empty: { alignItems: 'center', marginTop: 24, gap: 8 },
    emptyText: { fontSize: 14, color: c.subtext },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      ...cardShadow,
    },
    rowEmoji: { fontSize: 24 },
    rowMiddle: { flex: 1 },
    rowName: { fontSize: 15, fontWeight: '700', color: c.text },
    rowMeta: { fontSize: 12, color: c.subtext, marginTop: 2 },
    rowAmount: { fontSize: 16, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 4 },
  });
