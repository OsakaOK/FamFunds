// AddExpenseScreen — log a new expense.
//   * Category: a swipeable slider (swipe left/right; the centered one is picked).
//   * Date: tap to open a calendar.
//   * Amount + optional note.

import { useRef, useState } from 'react';
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
import { CATEGORIES, CATEGORY_EMOJI } from '../lib/categories';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

const ITEM_WIDTH = 120;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE_PAD = Math.max((SCREEN_WIDTH - ITEM_WIDTH) / 2, 16);

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddExpenseScreen({ navigation }: Props) {
  const { user, familyId } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [amount, setAmount] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(0); // index into CATEGORIES
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const listRef = useRef<FlatList>(null);
  const category = CATEGORIES[categoryIndex];

  // Keep the picked category in sync with whatever is centered in the slider.
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
    if (!user || !familyId) return;

    setBusy(true);
    const { error } = await supabase.from('expenses').insert({
      family_id: familyId,
      user_id: user.id,
      amount: numericAmount,
      category,
      note: note.trim() || null,
      spent_on: date,
    });
    setBusy(false);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    navigation.goBack();
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
            autoFocus
          />
        </View>

        {/* Category slider */}
        <Text style={styles.label}>Category — swipe to choose</Text>
        <Text style={styles.selectedCategory}>
          {CATEGORY_EMOJI[category]} {category}
        </Text>
        <FlatList
          ref={listRef}
          data={CATEGORIES}
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
                <Text style={[styles.catName, active && styles.catNameActive]}>
                  {item}
                </Text>
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
            <Text style={styles.buttonText}>Save expense</Text>
          )}
        </TouchableOpacity>
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
      marginHorizontal: 0,
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
