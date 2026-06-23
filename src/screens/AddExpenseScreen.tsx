// AddExpenseScreen — log a new expense, OR edit/delete an existing one.
// When navigated with { expenseId }, it loads that row, pre-fills the form,
// switches "Save" to update, and shows a Delete button. You can only open this
// for your OWN expenses (Home only makes your own rows tappable), and the
// database rules enforce the same.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
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

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { todayLocal } from '../lib/dates';
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

const ITEM_WIDTH = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_PAD = Math.max((SCREEN_WIDTH - ITEM_WIDTH) / 2, 16);

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
  const styles = makeStyles(colors);

  const expenseId = route.params?.expenseId;
  const isEditing = !!expenseId;

  const [amount, setAmount] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingExpense, setLoadingExpense] = useState(isEditing);
  const [showCalendar, setShowCalendar] = useState(false);

  const listRef = useRef<FlatList>(null);
  const category = CATEGORIES[categoryIndex];

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
          const idx = CATEGORIES.indexOf(data.category);
          const safeIdx = idx >= 0 ? idx : 0;
          setCategoryIndex(safeIdx);
          // Center the slider on the pre-filled category.
          setTimeout(
            () => listRef.current?.scrollToOffset({ offset: safeIdx * ITEM_WIDTH, animated: false }),
            0
          );
        }
        setLoadingExpense(false);
      });
  }, [expenseId]);

  function onSliderScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH);
    const clamped = Math.min(Math.max(index, 0), CATEGORIES.length - 1);
    if (clamped !== categoryIndex) setCategoryIndex(clamped);
  }

  function selectCategory(index: number) {
    setCategoryIndex(index);
    listRef.current?.scrollToOffset({ offset: index * ITEM_WIDTH, animated: true });
  }

  async function handleSave() {
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Check the amount', 'Enter an amount greater than 0.');
      return;
    }
    if (!userId || !currentSpaceId) return;

    setBusy(true);
    const fields = {
      amount: numericAmount,
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
      Alert.alert('Could not save', error.message);
      return;
    }
    navigation.goBack();
  }

  function handleDelete() {
    confirmDelete(async () => {
      if (!expenseId) return;
      setBusy(true);
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      setBusy(false);
      if (error) {
        Alert.alert('Could not delete', error.message);
        return;
      }
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
        <View style={styles.amountRow}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={colors.subtext}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!busy}
            autoFocus={!isEditing}
          />
        </View>

        {/* Category slider */}
        <Text style={styles.label}>Category — swipe to choose</Text>
        <Text style={styles.selectedCategory}>
          {CATEGORY_EMOJI[category]} {category}
        </Text>
        <FlatList
          ref={listRef}
          data={CATEGORIES as unknown as string[]}
          keyExtractor={(c) => c}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onSliderScroll}
          getItemLayout={(_, index) => ({
            length: ITEM_WIDTH,
            offset: ITEM_WIDTH * index,
            index,
          })}
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
          renderItem={({ item, index }) => {
            const active = index === categoryIndex;
            return (
              <TouchableOpacity
                style={[styles.catItem, active && styles.catItemActive]}
                onPress={() => selectCategory(index)}
                activeOpacity={0.8}
              >
                <Text style={styles.catEmoji}>{CATEGORY_EMOJI[item]}</Text>
                <Text style={[styles.catName, active && styles.catNameActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateField}
          onPress={() => setShowCalendar(true)}
          disabled={busy}
        >
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.dateIcon}>📅</Text>
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
    },
    selectedCategory: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    catItem: {
      width: ITEM_WIDTH,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    catItemActive: { borderColor: c.primary },
    catEmoji: { fontSize: 30, marginBottom: 6 },
    catName: { fontSize: 13, color: c.subtext, fontWeight: '600' },
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
    deleteBtn: { marginTop: 16, paddingVertical: 14, alignItems: 'center' },
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
