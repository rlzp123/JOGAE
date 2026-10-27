import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Supabase chama esses métodos também ao renovar tokens e ao sair da conta.
// Na Web, mantemos a persistência do navegador para desenvolvimento local.
export const authStorage = {
  async getItem(key) {
    if (!Capacitor.isNativePlatform()) return window.localStorage.getItem(key);
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key, value) {
    if (!Capacitor.isNativePlatform()) return window.localStorage.setItem(key, value);
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    if (!Capacitor.isNativePlatform()) return window.localStorage.removeItem(key);
    await Preferences.remove({ key });
  },
};
