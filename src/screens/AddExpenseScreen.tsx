// AddExpenseScreen — log a new expense, OR edit/delete an existing one.
// When navigated with { expenseId }, it loads that row, pre-fills the form,
// switches "Save" to update, and shows a Delete button. You can only open this
// for your OWN expenses (Home only makes your own rows tappable), and the
// database rules enforce the same.

import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useToast } from '../lib/ToastContext';
import { Colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { todayLocal } from '../lib/dates';
import { CATEGORIES, CATEGORY_EMOJI, Category } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

// Cross-platform confirm (react-native-web's Alert doesn't show buttons).
function confirmDelete(onYes: () => void) {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm?.('Delete this expense? This cannot be undone.')) {
      onYes();
    }
  } else {
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onYes },
    ]);
  }
}

export default function AddExpenseScreen({ navigation, route }: Props) {
  const { userId, currentSpaceId, displayName } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = makeStyles(colors);

  const expenseId = route.params?.expenseId;
  const isEditing = !!expenseId;

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('Groceries');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(isEditing);
  const [showCalendar, setShowCalendar] = useState(false);

  // Title in the header reflects the mode.
  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit expense' : 'Add expense' });
  }, [navigation, isEditing]);

  // In edit mode, load the existing expense and pre-fill the form.
  useEffect(() => {
    if (!expenseId) return;
    supabase
      .from('expenses')
      .select('amount, category, note, spent_on')
      .eq('id', expenseId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAmount(String(data.amount));
          setNote(data.note ?? '');
          setDate(data.spent_on);
          const valid = (CATEGORIES as readonly string[]).includes(data.category);
          setCategory((valid ? data.category : 'Groceries') as Category);
        }
        setLoadingExpense(false);
      });
  }, [expenseId]);

  function validateAmount() {
    const n = Number(amount);
    if (!amount || isNaN(n) || n <= 0) {
      setAmountError('Enter an amount greater than 0');
      return false;
    }
    setAmountError(null);
    return true;
  }

  async function handleSave() {
    if (!validateAmount()) return;
    if (!userId || !currentSpaceId) return;

    setBusy(true);
    const fields = {
      amount: Number(amount),
      category,
      note: note.trim() || null,
      spent_on: date,
    };
    const { error } = isEditing
      ? await supabase.from('expenses').update(fields).eq('id', expenseId)
      : await supabase.from('expenses').insert({
          ...fields,
          space_id: currentSpaceId,
          user_id: userId,
          logger_name: displayName, // snapshot so attribution survives leaving
        });
    setBusy(false);

    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(isEditing ? 'Expense updated' : 'Expense added', 'success');
    navigation.goBack();
  }

  function handleDelete() {
    confirmDelete(async () => {
      if (!expenseId) return;
      setBusy(true);
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      setBusy(false);
      if (error) {
        showToast(error.message, 'error');
        return;
      }
      showToast('Expense deleted', 'success');
      navigation.goBack();
    });
  }

  if (loadingExpense) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Amount */}
        <Text style={styles.label}>Amount</Text>
        <View style={[styles.amountRow, amountError ? { borderColor: colors.danger } : null]}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.subtext}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              if (amountError) setAmountError(null);
            }}
            onBlur={validateAmount}
            editable={!busy}
            autoFocus={!isEditing}
          />
        </View>
        {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}

        {/* Category grid */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.catCard, active && styles.catCardActive]}
                onPress={() => setCategory(c)}
                activeOpacity={0.8}
                disabled={busy}
              >
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.primary}
                    style={styles.catCheck}
                  />
                )}
                <Text style={styles.catEmoji}>{CATEGORY_EMOJI[c]}</Text>
                <Text style={[styles.catName, active && styles.catNameActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => setShowCalendar(true)}
          disabled={busy}
        >
          <Text style={styles.dateText}>{date}</Text>
          <Ionicons name="calendar-outline" size={18} color={colors.subtext} />
        </TouchableOpacity>

        {/* Note */}
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="e.g. weekly groceries at Costco"
          placeholderTextColor={colors.subtext}
          value={note}
          onChangeText={setNote}
          editable={!busy}
          multiline
        />

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.buttonText}>
              {isEditing ? 'Save changes' : 'Save expense'}
            </Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={busy}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.deleteText}>Delete expense</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Calendar popup */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={styles.calendarCard}>
            <Calendar
              current={date}
              onDayPress={(day) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{ [date]: { selected: true } }}
              theme={{
                calendarBackground: colors.card,
                dayTextColor: colors.text,
                monthTextColor: colors.text,
                textSectionTitleColor: colors.subtext,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.primaryText,
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                textDisabledColor: colors.subtext,
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
    scroll: { padding: 24 },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: c.subtext,
      marginBottom: 8,
      marginTop: 22,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      backgroundColor: c.inputBg,
    },
    currency: { fontSize: 24, color: c.subtext, fontWeight: '700' },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontWeight: '700',
      color: c.text,
      paddingVertical: 12,
      marginLeft: 8,
      fontVariant: ['tabular-nums'],
    },
    errorText: { color: c.danger, fontSize: 13, marginTop: 6, marginLeft: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard: {
      width: '47.5%',
      flexGrow: 1,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: c.border,
    },
    catCardActive: { borderColor: c.primary, backgroundColor: c.accentBg },
    catCheck: { position: 'absolute', top: 8, right: 8 },
    catEmoji: { fontSize: 28, marginBottom: 6 },
    catName: { fontSize: 14, color: c.subtext, fontWeight: '600' },
    catNameActive: { color: c.primary, fontWeight: '800' },
    dateField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: c.inputBg,
    },
    dateText: { fontSize: 16, color: c.text },
    dateIcon: { fontSize: 18 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    noteInput: { minHeight: 70, textAlignVertical: 'top' },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 32,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '700' },
    deleteBtn: {
      marginTop: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    deleteText: { color: c.danger, fontSize: 15, fontWeight: '700' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    calendarCard: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 8,
      overflow: 'hidden',
    },
  });
