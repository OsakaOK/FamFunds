// MembersScreen — the members of the current Space and their spend for the
// active month. Admins can promote or remove other members. Personal Spaces
// just show you.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useMonth } from '../lib/MonthContext';
import { Colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import MonthSwitcher from '../components/MonthSwitcher';

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function confirmRemove(name: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm?.(`Remove ${name} from this space? Their expenses stay.`)) {
      onYes();
    }
  } else {
    Alert.alert('Remove member?', `Remove ${name}? Their expenses stay in the ledger.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onYes },
    ]);
  }
}

type MemberRow = { userId: string; name: string; role: string; total: number };

export default function MembersScreen() {
  const { userId, currentSpaceId, currentSpace, isAdmin, refreshSpaces } = useAuth();
  const { colors } = useTheme();
  const { range } = useMonth();
  const styles = makeStyles(colors);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [familyTotal, setFamilyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentSpaceId) return;

    const { data: memberRows } = await supabase
      .from('space_members')
      .select('user_id, role')
      .eq('space_id', currentSpaceId);
    const rows = memberRows ?? [];

    const ids = rows.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', ids);
    const nameMap: Record<string, string> = {};
    (profiles ?? []).forEach((p) => {
      nameMap[p.id] = p.full_name || p.email || 'Member';
    });

    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('user_id, amount')
      .eq('space_id', currentSpaceId)
      .gte('spent_on', range.start)
      .lt('spent_on', range.endExclusive);
    const spentMap: Record<string, number> = {};
    let total = 0;
    (expenseRows ?? []).forEach((e) => {
      const amt = Number(e.amount);
      spentMap[e.user_id] = (spentMap[e.user_id] ?? 0) + amt;
      total += amt;
    });
    setFamilyTotal(total);

    setMembers(
      rows
        .map((m) => ({
          userId: m.user_id,
          name: nameMap[m.user_id] ?? 'Member',
          role: m.role,
          total: spentMap[m.user_id] ?? 0,
        }))
        .sort((a, b) => b.total - a.total)
    );
    setLoading(false);
  }, [currentSpaceId, range.start, range.endExclusive]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function promote(target: string) {
    if (!currentSpaceId) return;
    setActingOn(target);
    const { error } = await supabase.rpc('promote_member', { space: currentSpaceId, target });
    await Promise.all([load(), refreshSpaces(currentSpaceId)]);
    setActingOn(null);
    if (error) Alert.alert('Could not promote', error.message);
  }

  function remove(target: string, name: string) {
    if (!currentSpaceId) return;
    confirmRemove(name, async () => {
      setActingOn(target);
      const { error } = await supabase.rpc('remove_member', { space: currentSpaceId, target });
      await load();
      setActingOn(null);
      if (error) Alert.alert('Could not remove', error.message);
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isFamily = currentSpace?.kind === 'family';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isFamily ? (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{currentSpace?.inviteCode ?? '—'}</Text>
          <Text style={styles.inviteHint}>Manage the code in Spaces.</Text>
        </View>
      ) : (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteHint}>
            This is your private Personal Space — only you can see it.
          </Text>
        </View>
      )}

      <MonthSwitcher />
      <Text style={styles.sectionTitle}>Spending breakdown</Text>

      {members.map((m) => {
        const share = familyTotal > 0 ? m.total / familyTotal : 0;
        const isMe = m.userId === userId;
        const canManage = isAdmin && isFamily && !isMe;
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
            <Text style={styles.shareText}>{(share * 100).toFixed(0)}% of spending</Text>

            {canManage && (
              <View style={styles.actions}>
                {m.role !== 'admin' && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => promote(m.userId)}
                    disabled={actingOn === m.userId}
                  >
                    <Text style={styles.actionText}>Make admin</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => remove(m.userId, m.name)}
                  disabled={actingOn === m.userId}
                >
                  <Text style={[styles.actionText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
    inviteCard: {
      backgroundColor: c.accentBg,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    inviteLabel: { fontSize: 13, color: c.subtext },
    inviteCode: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 4,
      color: c.primary,
      marginVertical: 4,
    },
    inviteHint: { fontSize: 13, color: c.subtext, textAlign: 'center' },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      marginTop: 16,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    name: { fontSize: 16, fontWeight: '700', color: c.text },
    amount: { fontSize: 16, fontWeight: '800', color: c.text },
    track: { height: 10, borderRadius: 5, backgroundColor: c.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5, backgroundColor: c.primary },
    shareText: { fontSize: 13, color: c.subtext, marginTop: 6 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    actionBtn: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    actionText: { fontSize: 13, fontWeight: '700', color: c.primary },
  });
