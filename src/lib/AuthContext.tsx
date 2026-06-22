// AuthContext — one place that knows: who is logged in, and which family they belong to.
// Any screen can read this with the useAuth() hook instead of re-checking Supabase itself.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthResult = { error: string | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  familyId: string | null;
  profileName: string | null; // the display name shown instead of email
  loading: boolean; // still figuring out session + family on app start
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshFamily: () => Promise<void>; // call after creating/joining a family
  updateProfileName: (name: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the logged-in user's display name from their profile.
  async function loadProfile(currentSession: Session | null) {
    if (!currentSession) {
      setProfileName(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', currentSession.user.id)
      .maybeSingle();
    setProfileName(data?.full_name ?? null);
  }

  // Look up which family (if any) the logged-in user belongs to.
  async function loadFamily(currentSession: Session | null) {
    if (!currentSession) {
      setFamilyId(null);
      return;
    }
    const { data, error } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', currentSession.user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Could not load family membership:', error.message);
      setFamilyId(null);
      return;
    }
    setFamilyId(data?.family_id ?? null);
  }

  useEffect(() => {
    // 1. Get whatever session is already saved on this device.
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await Promise.all([loadFamily(data.session), loadProfile(data.session)]);
      setLoading(false);
    });

    // 2. Keep listening for login / logout events from anywhere in the app.
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        await Promise.all([loadFamily(newSession), loadProfile(newSession)]);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setFamilyId(null);
  }

  async function refreshFamily() {
    await loadFamily(session);
  }

  async function updateProfileName(name: string): Promise<AuthResult> {
    if (!session) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', session.user.id);
    if (!error) setProfileName(name.trim());
    return { error: error?.message ?? null };
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    familyId,
    profileName,
    loading,
    signIn,
    signUp,
    signOut,
    refreshFamily,
    updateProfileName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Small helper so screens can just call useAuth().
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
