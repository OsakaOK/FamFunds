// FamilySetupScreen — shown right after login if the user isn't in a family yet.
// Create a new family, or join an existing one with an invite code.

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function FamilySetupScreen() {
  const { signOut, refreshFamily } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!familyName.trim()) {
      Alert.alert('Name needed', 'Give your family a name.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('create_family', {
      family_name: familyName.trim(),
    });
    setBusy(false);
    if (error) {
      Alert.alert('Could not create family', error.message);
      return;
    }
    await refreshFamily();
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      Alert.alert('Code needed', 'Enter the invite code you were given.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('join_family', { code: inviteCode.trim() });
    setBusy(false);
    if (error) {
      Alert.alert('Could not join', error.message);
      return;
    }
    await refreshFamily();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your family</Text>
      <Text style={styles.subtitle}>
        Create a new family group, or join one with an invite code.
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'create' && styles.tabActive]}
          onPress={() => setTab('create')}
        >
          <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>
            Create
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'join' && styles.tabActive]}
          onPress={() => setTab('join')}
        >
          <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>
            Join
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'create' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Family name (e.g. The Smiths)"
            placeholderTextColor={colors.subtext}
            value={familyName}
            onChangeText={setFamilyName}
            editable={!busy}
          />
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Create family</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Invite code"
            placeholderTextColor={colors.subtext}
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
            editable={!busy}
          />
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Join family</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.signOut} onPress={signOut} disabled={busy}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      backgroundColor: c.bg,
    },
    title: { fontSize: 26, fontWeight: '800', color: c.text, textAlign: 'center' },
    subtitle: {
      fontSize: 15,
      color: c.subtext,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 28,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: c.chip,
      borderRadius: 10,
      padding: 4,
      marginBottom: 20,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    tabActive: { backgroundColor: c.card },
    tabText: { color: c.subtext, fontWeight: '600' },
    tabTextActive: { color: c.primary },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      marginBottom: 14,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '700' },
    signOut: { marginTop: 32, alignItems: 'center' },
    signOutText: { color: c.subtext, fontSize: 14 },
  });
