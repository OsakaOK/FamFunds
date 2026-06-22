// SettingsScreen — set your display name, switch light/dark mode, and sign out.

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';

export default function SettingsScreen() {
  const { user, profileName, updateProfileName, signOut } = useAuth();
  const { mode, colors, toggle } = useTheme();
  const styles = makeStyles(colors);

  const [name, setName] = useState(profileName ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSaveName() {
    if (!name.trim()) {
      Alert.alert('Name needed', 'Enter a display name.');
      return;
    }
    setSaving(true);
    const { error } = await updateProfileName(name);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error);
      return;
    }
    Alert.alert('Saved', 'Your name has been updated.');
  }

  return (
    <View style={styles.container}>
      {/* Display name */}
      <Text style={styles.sectionLabel}>YOUR NAME</Text>
      <View style={styles.card}>
        <Text style={styles.help}>
          This is shown to your family instead of your email
          {user?.email ? ` (${user.email})` : ''}.
        </Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Osaka"
            placeholderTextColor={colors.subtext}
            value={name}
            onChangeText={setName}
            editable={!saving}
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveName}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.primaryText} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Appearance */}
      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>Dark mode</Text>
            <Text style={styles.help}>Easier on the eyes at night.</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ true: colors.primary, false: colors.track }}
          />
        </View>
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
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
    card: { backgroundColor: c.card, borderRadius: 12, padding: 16 },
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
    switchTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    signOutBtn: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    signOutText: { color: c.danger, fontSize: 16, fontWeight: '700' },
  });
