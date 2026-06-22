// HomeScreen — placeholder for now. It just confirms the full flow works:
// you're logged in AND in a family. We'll build the real expense feed here next
// (Phase 2 of the plan).

import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const { user, familyId, signOut } = useAuth();
  const [familyName, setFamilyName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');

  // Load this family's name + invite code to show (and to share with relatives).
  useEffect(() => {
    if (!familyId) return;
    supabase
      .from('families')
      .select('name, invite_code')
      .eq('id', familyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFamilyName(data.name);
          setInviteCode(data.invite_code);
        }
      });
  }, [familyId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>You're all set! 🎉</Text>
        <Text style={styles.line}>Signed in as {user?.email}</Text>
        {familyName ? (
          <Text style={styles.line}>Family: {familyName}</Text>
        ) : null}
        {inviteCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Invite code (share with family)</Text>
            <Text style={styles.code}>{inviteCode}</Text>
          </View>
        ) : null}

        <Text style={styles.hint}>
          Next up: the expense feed and "Add expense" screen.
        </Text>
      </View>

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  line: { fontSize: 16, color: '#374151', marginBottom: 6 },
  codeBox: {
    marginTop: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  codeLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: '#2563eb' },
  hint: { marginTop: 28, fontSize: 14, color: '#9ca3af' },
  signOut: { padding: 24, alignItems: 'center' },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
