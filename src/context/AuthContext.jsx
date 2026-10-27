import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, redirectUrl } from '../lib/supabaseClient';
import { authError } from '../lib/authErrors';
import { signInWithGoogle, listenForNativeAuth } from '../lib/nativeAuth';

const AuthContext = createContext(null);
const RECOVERY = 'jogae:password-recovery';

function recoveryRequested() {
  return new URLSearchParams(window.location.search).get('auth') === 'recovery'
    || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'
    || sessionStorage.getItem(RECOVERY) === 'true';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(recoveryRequested);
  const [initialError, setInitialError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let receivedEvent = false;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (params.get('error') || query.get('error')) {
      setInitialError(authError({ message: params.get('error_description') || query.get('error_description') }));
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      setSession(nextSession);
      if (nextSession) setInitialError('');
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(RECOVERY, 'true');
        setRecovery(true);
      } else if (!nextSession) {
        sessionStorage.removeItem(RECOVERY);
        setRecovery(false);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedEvent) return;
      if (error) setInitialError(authError(error));
      setSession(data?.session || null);
      if (!data?.session) {
        sessionStorage.removeItem(RECOVERY);
        setRecovery(false);
      }
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setInitialError(authError(error));
      setLoading(false);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};
    listenForNativeAuth((error) => { if (!disposed) setInitialError(authError(error)); })
      .then((remove) => { if (disposed) remove(); else unsubscribe = remove; })
      .catch((error) => { if (!disposed) setInitialError(authError(error)); });
    return () => { disposed = true; unsubscribe(); };
  }, []);

  const actions = useMemo(() => ({
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (name, email, password) => supabase.auth.signUp({
      email, password, options: { data: { full_name: name.trim(), display_name: name.trim() }, emailRedirectTo: redirectUrl() },
    }),
    resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl(true) }),
    updatePassword: (password) => supabase.auth.updateUser({ password }),
    signInGoogle: signInWithGoogle,
    signOut: () => supabase.auth.signOut(),
    finishRecovery: () => {
      setRecovery(false);
      sessionStorage.removeItem(RECOVERY);
      const current = new URL(window.location.href);
      current.searchParams.delete('auth');
      current.hash = '';
      window.history.replaceState({}, '', current.href);
    },
  }), []);

  return <AuthContext.Provider value={{ session, user: session?.user || null, loading, recovery, initialError, ...actions }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider.');
  return context;
}
