import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { authStorage } from './authStorage';

export const nativeRedirectUrl = 'jogae://auth/callback';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(
  url && key && /^https?:\/\//.test(url) && !/SEU_PROJECT_REF/.test(url)
  && !/SUA_CHAVE|SUBSTITUA/.test(key)
);
export const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED !== 'false';
export const supabase = isSupabaseConfigured ? createClient(url, key, {
  auth: {
    storage: authStorage,
    storageKey: 'supabase_session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    flowType: Capacitor.isNativePlatform() ? 'pkce' : 'implicit',
  },
}) : null;

export function redirectUrl(recovery = false) {
  if (Capacitor.isNativePlatform()) return nativeRedirectUrl;
  const target = new URL(window.location.pathname, window.location.origin);
  if (recovery) target.searchParams.set('auth', 'recovery');
  return target.href;
}
