// FamilySetupScreen — shown right after login if the user isn't in a family yet.
// Two choices: create a brand new family, or join an existing one with an invite code.
//
// Both actions call database functions (create_family / join_family) that handle the
// work safely on the server. After success we refresh AuthContext and the navigator
// moves the user to Home.

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
import { supabase } from '../lib/supabase';

export default function FamilySetupScreen() {
  const { signOut, refreshFamily } = useAuth();

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
    await refreshFamily(); // navigator now sends us to Home
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      Alert.alert('Code needed', 'Enter the invite code you were given.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('join_family', {
      code: inviteCode.trim(),
    });
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

      {/* Tab switcher */}
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
              <ActivityIndicator color="#fff" />
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
              <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#2563eb' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signOut: { marginTop: 32, alignItems: 'center' },
  signOutText: { color: '#9ca3af', fontSize: 14 },
});
