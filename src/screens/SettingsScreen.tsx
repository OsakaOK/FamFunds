// SettingsScreen — set your display name, switch light/dark mode, and sign out.

import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useToast } from '../lib/ToastContext';
import { Colors, cardShadow } from '../lib/theme';

export default function SettingsScreen() {
  const { email, profileName, updateProfileName, signOut } = useAuth();
  const { mode, colors, toggle } = useTheme();
  const { showToast } = useToast();
  const styles = makeStyles(colors);

  const [name, setName] = useState(profileName ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    if (!name.trim()) {
      showToast('Enter a display name', 'error');
      return;
    }
    setSaving(true);
    const { error } = await updateProfileName(name);
    setSaving(false);
    showToast(error ?? 'Name updated', error ? 'error' : 'success');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>YOUR NAME</Text>
      <View style={styles.card}>
        <Text style={styles.help}>
          Shown to your family instead of your email{email ? ` (${email})` : ''}.
        </Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Osaka"
            placeholderTextColor={colors.subtext}
            value={name}
            onChangeText={setName}
            editable={!saving}
            autoCapitalize="words"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons
              name={mode === 'dark' ? 'moon' : 'sunny'}
              size={20}
              color={colors.primary}
            />
            <View>
              <Text style={styles.switchTitle}>Dark mode</Text>
              <Text style={styles.help}>Easier on the eyes at night.</Text>
            </View>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ true: colors.primary, false: colors.track }}
          />
        </View>
      </View>

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, padding: 16 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.subtext,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    card: { backgroundColor: c.card, borderRadius: 14, padding: 16, ...cardShadow },
    help: { fontSize: 13, color: c.subtext, marginBottom: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    saveBtn: {
      marginLeft: 10,
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      minWidth: 72,
      alignItems: 'center',
    },
    saveBtnText: { color: c.primaryText, fontWeight: '700' },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    switchTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    signOutBtn: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...cardShadow,
    },
    signOutText: { color: c.danger, fontSize: 16, fontWeight: '700' },
  });
