// SpacesScreen — switch between your Spaces, create or join a Family Space,
// rotate the invite code (admins), or leave a Family Space.

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useToast } from '../lib/ToastContext';
import { Colors, cardShadow } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Spaces'>;

function confirmLeave(name: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm?.(`Leave "${name}"? You can rejoin with the invite code.`)) {
      onYes();
    }
  } else {
    Alert.alert('Leave space?', `Leave "${name}"? You can rejoin with the invite code.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onYes },
    ]);
  }
}

export default function SpacesScreen({ navigation }: Props) {
  const { spaces, currentSpaceId, currentSpace, isAdmin, switchSpace, refreshSpaces } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = makeStyles(colors);

  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  function pick(spaceId: string) {
    switchSpace(spaceId);
    navigation.goBack();
  }

  async function handleCreate() {
    if (!familyName.trim()) {
      showToast('Give your family a name', 'error');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('create_space', { space_name: familyName.trim() });
    if (!error) await refreshSpaces(data as string);
    setBusy(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast(`Created ${familyName.trim()}`, 'success');
    switchSpace(data as string);
    navigation.goBack();
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      showToast('Enter an invite code', 'error');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('join_space', { code: joinCode.trim() });
    if (!error) await refreshSpaces(data as string);
    setBusy(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Joined space', 'success');
    switchSpace(data as string);
    navigation.goBack();
  }

  async function handleRegenerate() {
    if (!currentSpaceId) return;
    setBusy(true);
    const { error } = await supabase.rpc('regenerate_invite_code', { space: currentSpaceId });
    if (!error) await refreshSpaces(currentSpaceId);
    setBusy(false);
    showToast(error ? error.message : 'New invite code generated', error ? 'error' : 'success');
  }

  function handleLeave() {
    if (!currentSpace || currentSpace.kind !== 'family') return;
    const name = currentSpace.name;
    confirmLeave(name, async () => {
      setBusy(true);
      const { error } = await supabase.rpc('leave_space', { space: currentSpace.id });
      if (!error) await refreshSpaces();
      setBusy(false);
      showToast(error ? error.message : `Left ${name}`, error ? 'error' : 'success');
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>YOUR SPACES</Text>
      {spaces.map((s) => {
        const active = s.id === currentSpaceId;
        return (
          <TouchableOpacity
            key={s.id}
            style={[styles.spaceRow, active && styles.spaceRowActive]}
            onPress={() => pick(s.id)}
          >
            <View style={styles.spaceLeft}>
              <View style={styles.spaceIcon}>
                <Ionicons
                  name={s.kind === 'personal' ? 'lock-closed' : 'people'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={{ flexShrink: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.spaceName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.role === 'admin' && (
                    <View style={styles.adminPill}>
                      <Text style={styles.adminPillText}>Admin</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.spaceKind}>
                  {s.kind === 'personal' ? 'Personal · private' : 'Family · shared'}
                </Text>
              </View>
            </View>
            {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
          </TouchableOpacity>
        );
      })}

      {currentSpace?.kind === 'family' && (
        <>
          <Text style={styles.sectionLabel}>CURRENT FAMILY · {currentSpace.name.toUpperCase()}</Text>
          <View style={styles.card}>
            <Text style={styles.help}>Invite code — share it so others can join.</Text>
            <Text style={styles.code}>{currentSpace.inviteCode ?? '—'}</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRegenerate} disabled={busy}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Regenerate code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} disabled={busy}>
              <Ionicons name="exit-outline" size={16} color={colors.danger} />
              <Text style={styles.leaveText}>Leave this space</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>CREATE A FAMILY SPACE</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Family name (e.g. The Smiths)"
          placeholderTextColor={colors.subtext}
          value={familyName}
          onChangeText={setFamilyName}
          editable={!busy}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryBtnText}>Create family</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>JOIN A FAMILY SPACE</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Invite code"
          placeholderTextColor={colors.subtext}
          autoCapitalize="characters"
          value={joinCode}
          onChangeText={setJoinCode}
          editable={!busy}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryBtnText}>Join family</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.subtext,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    spaceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      ...cardShadow,
    },
    spaceRowActive: { borderColor: c.primary },
    spaceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    spaceIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    spaceName: { fontSize: 16, fontWeight: '700', color: c.text },
    adminPill: { backgroundColor: c.accentBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    adminPillText: { fontSize: 11, fontWeight: '700', color: c.primary },
    spaceKind: { fontSize: 13, color: c.subtext, marginTop: 2 },
    card: { backgroundColor: c.card, borderRadius: 14, padding: 16, ...cardShadow },
    help: { fontSize: 13, color: c.subtext, marginBottom: 6 },
    code: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 4,
      color: c.primary,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      marginBottom: 12,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: { color: c.primaryText, fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 10,
      paddingVertical: 12,
    },
    secondaryBtnText: { color: c.primary, fontSize: 15, fontWeight: '700' },
    leaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      marginTop: 4,
    },
    leaveText: { color: c.danger, fontSize: 15, fontWeight: '700' },
  });
