// MembersScreen — each family member and how much they've spent this month.
// Also shows the family invite code so you can add more people.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

type MemberRow = {
  userId: string;
  name: string;
  role: string;
  total: number;
};

export default function MembersScreen() {
  const { user, familyId } = useAuth();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [familyTotal, setFamilyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!familyId) return;

    // Family info (name + invite code).
    const { data: family } = await supabase
      .from('families')
      .select('invite_code')
      .eq('id', familyId)
      .maybeSingle();
    if (family) setInviteCode(family.invite_code);

    // Who's in the family.
    const { data: memberRows } = await supabase
      .from('family_members')
      .select('user_id, role')
      .eq('family_id', familyId);
    const rows = memberRows ?? [];

    // Their display names.
    const ids = rows.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', ids);
    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p) => {
      nameMap[p.id] = p.full_name || p.email || 'Member';
    });

    // This month's spending, summed per person.
    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('user_id, amount')
      .eq('family_id', familyId)
      .gte('spent_on', startOfMonth());
    const spentMap: Record<string, number> = {};
    let total = 0;
    (expenseRows ?? []).forEach((e) => {
      const amt = Number(e.amount);
      spentMap[e.user_id] = (spentMap[e.user_id] ?? 0) + amt;
      total += amt;
    });
    setFamilyTotal(total);

    const built: MemberRow[] = rows
      .map((m) => ({
        userId: m.user_id,
        name: nameMap[m.user_id] ?? 'Member',
        role: m.role,
        total: spentMap[m.user_id] ?? 0,
      }))
      .sort((a, b) => b.total - a.total); // biggest spender first
    setMembers(built);
    setLoading(false);
  }, [familyId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Invite code card */}
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Invite code</Text>
        <Text style={styles.inviteCode}>{inviteCode}</Text>
        <Text style={styles.inviteHint}>
          Share this so family members can join your group.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Spending this month</Text>

      {members.map((m) => {
        const share = familyTotal > 0 ? m.total / familyTotal : 0;
        const isMe = m.userId === user?.id;
        return (
          <View key={m.userId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>
                {isMe ? 'You' : m.name}
                {m.role === 'admin' ? '  👑' : ''}
              </Text>
              <Text style={styles.amount}>{money(m.total)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${share * 100}%` }]} />
            </View>
            <Text style={styles.shareText}>
              {(share * 100).toFixed(0)}% of family spending
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  inviteCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteLabel: { fontSize: 13, color: '#6b7280' },
  inviteCode: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#2563eb',
    marginVertical: 4,
  },
  inviteHint: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  amount: { fontSize: 16, fontWeight: '800', color: '#111827' },
  track: { height: 10, borderRadius: 5, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: '#2563eb' },
  shareText: { fontSize: 13, color: '#6b7280', marginTop: 6 },
});
