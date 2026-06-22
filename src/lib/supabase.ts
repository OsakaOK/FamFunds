// Supabase client — the single connection your whole app uses to talk to the backend.
//
// We store the login session in AsyncStorage. It works on web (localStorage) AND on
// iOS/Android, so your "website first, app later" plan keeps working everywhere.
// (Later, for extra security on real devices, this can be swapped for expo-secure-store.)

import 'react-native-url-polyfill/auto'; // makes fetch/URL work the same on native and web
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// These come from your .env file. The EXPO_PUBLIC_ prefix is required so Expo
// exposes them to the app. The anon key is safe to ship — your data is protected
// by Row Level Security rules in the database, not by hiding this key.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase keys. Create a .env file in the project root with ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true, // keeps the user logged in by refreshing tokens
    persistSession: true, // remember the user between app restarts
    detectSessionInUrl: false, // we use email/password, not magic links
  },
});
