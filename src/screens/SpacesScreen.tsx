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

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Colors } from '../lib/theme';
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
      Alert.alert('Name needed', 'Give your family a name.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('create_space', { space_name: familyName.trim() });
    if (!error) await refreshSpaces(data as string);
    setBusy(false);
    if (error) {
      Alert.alert('Could not create', error.message);
      return;
    }
    switchSpace(data as string);
    navigation.goBack();
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      Alert.alert('Code needed', 'Enter the invite code.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('join_space', { code: joinCode.trim() });
    if (!error) await refreshSpaces(data as string);
    setBusy(false);
    if (error) {
      Alert.alert('Could not join', error.message);
      return;
    }
    switchSpace(data as string);
    navigation.goBack();
  }

  async function handleRegenerate() {
    if (!currentSpaceId) return;
    setBusy(true);
    const { error } = await supabase.rpc('regenerate_invite_code', { space: currentSpaceId });
    if (!error) await refreshSpaces(currentSpaceId);
    setBusy(false);
    if (error) Alert.alert('Could not regenerate', error.message);
  }

  function handleLeave() {
    if (!currentSpace || currentSpace.kind !== 'family') return;
    confirmLeave(currentSpace.name, async () => {
      setBusy(true);
      const { error } = await supabase.rpc('leave_space', { space: currentSpace.id });
      if (!error) await refreshSpaces();
      setBusy(false);
      if (error) Alert.alert('Could not leave', error.message);
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
            <View>
              <Text style={styles.spaceName}>
                {s.name}
                {s.role === 'admin' ? '  👑' : ''}
              </Text>
              <Text style={styles.spaceKind}>
                {s.kind === 'personal' ? 'Personal · private' : 'Family · shared'}
              </Text>
            </View>
            {active && <Text style={styles.current}>Viewing</Text>}
          </TouchableOpacity>
        );
      })}

      {/* Current family Space actions */}
      {currentSpace?.kind === 'family' && (
        <>
          <Text style={styles.sectionLabel}>CURRENT FAMILY · {currentSpace.name.toUpperCase()}</Text>
          <View style={styles.card}>
            <Text style={styles.help}>Invite code — share it so others can join.</Text>
            <Text style={styles.code}>{currentSpace.inviteCode ?? '—'}</Text>
            {isAdmin && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRegenerate} disabled={busy}>
                <Text style={styles.secondaryBtnText}>Regenerate code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} disabled={busy}>
              <Text style={styles.leaveText}>Leave this space</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Create / join */}
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
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    spaceRowActive: { borderColor: c.primary },
    spaceName: { fontSize: 16, fontWeight: '700', color: c.text },
    spaceKind: { fontSize: 13, color: c.subtext, marginTop: 2 },
    current: { fontSize: 13, fontWeight: '700', color: c.primary },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 16 },
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
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryBtnText: { color: c.primary, fontSize: 15, fontWeight: '700' },
    leaveBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    leaveText: { color: c.danger, fontSize: 15, fontWeight: '700' },
  });
