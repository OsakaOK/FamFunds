// AuthContext — knows: who is logged in, their display name, the Spaces they
// belong to, and which Space they're currently viewing.
//
// Every user always has at least their Personal Space (auto-created at signup),
// so there's no "no space" state to handle.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Remembers which Space you were last viewing, so a page refresh keeps you there.
const SPACE_KEY = 'famfunds.currentSpace';

type AuthResult = { error: string | null };

export type Space = {
  id: string;
  name: string;
  kind: 'personal' | 'family';
  role: 'admin' | 'member';
  inviteCode: string | null;
};

type AuthContextValue = {
  session: Session | null;
  userId: string | null;
  email: string | null;
  profileName: string | null;
  displayName: string; // profileName, else email, else "Member"
  spaces: Space[];
  currentSpaceId: string | null;
  currentSpace: Space | null;
  isAdmin: boolean; // admin of the current Space
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  switchSpace: (spaceId: string) => void;
  refreshSpaces: (preferSpaceId?: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(s: Session | null) {
    if (!s) {
      setProfileName(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', s.user.id)
      .maybeSingle();
    setProfileName(data?.full_name ?? null);
  }

  // Load every Space the user belongs to. Defaults the current Space to the
  // Personal one (or `preferSpaceId` if it's in the list).
  async function loadSpaces(s: Session | null, preferSpaceId?: string) {
    if (!s) {
      setSpaces([]);
      setCurrentSpaceId(null);
      return;
    }
    const { data, error } = await supabase
      .from('space_members')
      .select('role, spaces(id, name, kind, invite_code)')
      .eq('user_id', s.user.id);

    if (error) {
      console.warn('Could not load spaces:', error.message);
      return;
    }

    const built: Space[] = (data ?? [])
      .map((row: any) => {
        const sp = row.spaces;
        if (!sp) return null;
        return {
          id: sp.id,
          name: sp.name,
          kind: sp.kind,
          role: row.role,
          inviteCode: sp.invite_code ?? null,
        } as Space;
      })
      .filter(Boolean) as Space[];

    // personal first, then family spaces by name
    built.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'personal' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    setSpaces(built);

    // Pick which Space to view: explicit preference > last-viewed (saved) > Personal.
    const ids = built.map((sp) => sp.id);
    let target: string | null = null;
    if (preferSpaceId && ids.includes(preferSpaceId)) {
      target = preferSpaceId;
    } else {
      const stored = await AsyncStorage.getItem(SPACE_KEY);
      if (stored && ids.includes(stored)) target = stored;
    }
    if (!target) {
      target = built.find((sp) => sp.kind === 'personal')?.id ?? built[0]?.id ?? null;
    }
    setCurrentSpaceId(target);
    if (target) AsyncStorage.setItem(SPACE_KEY, target);
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        try {
          await Promise.all([loadProfile(data.session), loadSpaces(data.session)]);
        } finally {
          setLoading(false); // never get stuck on the spinner
        }
      })
      .catch((e) => {
        console.warn('Auth init failed:', e);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, newSession) => {
      setSession(newSession);
      try {
        await Promise.all([loadProfile(newSession), loadSpaces(newSession)]);
      } catch (e) {
        console.warn('Auth refresh failed:', e);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSpaces([]);
    setCurrentSpaceId(null);
    AsyncStorage.removeItem(SPACE_KEY);
  }

  function switchSpace(spaceId: string) {
    setCurrentSpaceId(spaceId);
    AsyncStorage.setItem(SPACE_KEY, spaceId); // remember across refreshes
  }

  async function refreshSpaces(preferSpaceId?: string) {
    await loadSpaces(session, preferSpaceId);
  }

  async function updateProfileName(name: string): Promise<AuthResult> {
    if (!session) return { error: 'Not signed in' };
    const trimmed = name.trim();

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', session.user.id);
    if (error) return { error: error.message };

    setProfileName(trimmed);

    // Refresh the attribution snapshot on your existing expenses so other members
    // see the new name instead of the name/email captured when you logged them.
    await supabase.from('expenses').update({ logger_name: trimmed }).eq('user_id', session.user.id);

    return { error: null };
  }

  const email = session?.user.email ?? null;
  const displayName = profileName || email || 'Member';
  const currentSpace = spaces.find((s) => s.id === currentSpaceId) ?? null;

  const value: AuthContextValue = {
    session,
    userId: session?.user.id ?? null,
    email,
    profileName,
    displayName,
    spaces,
    currentSpaceId,
    currentSpace,
    isAdmin: currentSpace?.role === 'admin',
    loading,
    signIn,
    signUp,
    signOut,
    switchSpace,
    refreshSpaces,
    updateProfileName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
