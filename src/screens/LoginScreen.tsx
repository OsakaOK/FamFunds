// LoginScreen — one screen that handles both signing in and creating an account.
// Toggle between the two modes with the link at the bottom.

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'signUp';

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setBusy(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setBusy(false);

    if (error) {
      Alert.alert(isSignUp ? 'Sign up failed' : 'Sign in failed', error);
    } else if (isSignUp) {
      Alert.alert(
        'Check your email',
        'If email confirmation is on, tap the link we sent, then sign in.'
      );
      setMode('signIn');
    }
    // On a successful sign in, AuthContext updates and the navigator moves us on.
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Enter your email', 'Type your email above first, then tap this.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    Alert.alert(
      error ? 'Could not send' : 'Email sent',
      error ? error.message : 'Check your inbox for a password reset link.'
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>FamFunds</Text>
      <Text style={styles.subtitle}>Track your family's spending together</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </Text>
        )}
      </TouchableOpacity>

      {!isSignUp && (
        <TouchableOpacity onPress={handleForgotPassword} disabled={busy}>
          <Text style={styles.link}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setMode(isSignUp ? 'signIn' : 'signUp')}
        disabled={busy}
      >
        <Text style={styles.toggleText}>
          {isSignUp
            ? 'Already have an account? Sign in'
            : "New here? Create an account"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2563eb',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
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
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  toggle: { marginTop: 28, alignItems: 'center' },
  toggleText: { color: '#374151', fontSize: 14 },
});
