import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, nativeRedirectUrl, redirectUrl } from './supabaseClient';

export async function signInWithGoogle() {
  if (!supabase) {
    return {
      data: null,
      error: new Error('O Supabase não foi configurado corretamente. Verifique as variáveis VITE_ e reinicie o app.'),
    };
  }

  const native = Capacitor.isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: native ? nativeRedirectUrl : redirectUrl(),
      ...(native ? { skipBrowserRedirect: true } : {}),
    },
  });

  if (error) return { data, error };
  if (!native) return { data, error: null };
  if (!data?.url) {
    return { data, error: new Error('O Google não forneceu a página de acesso.') };
  }

  await Browser.open({ url: data.url });
  return { data, error: null };
}

export async function handleNativeAuthUrl(incomingUrl) {
  if (!Capacitor.isNativePlatform() || !incomingUrl?.startsWith(nativeRedirectUrl)) return false;

  const url = new URL(incomingUrl);
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (oauthError) throw new Error(oauthError);

  const code = url.searchParams.get('code');
  if (!code) throw new Error('O Google não retornou um código de autenticação.');

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;

  await Browser.close().catch(() => {});
  return true;
}

export async function listenForNativeAuth(onError) {
  if (!Capacitor.isNativePlatform()) return () => {};

  let latestUrl = '';

  const receive = async (url) => {
    if (!url?.startsWith(nativeRedirectUrl) || url === latestUrl) return;
    latestUrl = url;
    try {
      await handleNativeAuthUrl(url);
    } catch (error) {
      onError(error);
    }
  };

  const listener = await App.addListener('appUrlOpen', ({ url }) => {
    void receive(url);
  });

  const launch = await App.getLaunchUrl();
  if (launch?.url) void receive(launch.url);

  return () => {
    void listener.remove();
  };
}
