import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { authError } from '../lib/authErrors';
import UserAvatar from './UserAvatar';

export default function AccountControls({ onOpenGames }) {
  const { user, signOut } = useAuth();
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const connect = () => setTarget(document.querySelector('#root .cart-button')?.parentElement || null);
    const observer = new MutationObserver(connect);
    observer.observe(document.body, { childList: true, subtree: true });
    connect();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);
  async function logout() {
    setBusy(true); setError('');
    try { const { error } = await signOut(); if (error) throw error; }
    catch (error) { setError(authError(error)); }
    finally { setBusy(false); }
  }
  const button = <button type="button" className={`ja-account-nav ${target ? '' : 'ja-account-fallback'}`} aria-label="Minha conta" aria-expanded={open} aria-controls="account-panel" onClick={() => setOpen(!open)}><UserAvatar user={user} /><span className="ja-account-label">Minha conta</span></button>;
  return <>
    {target ? createPortal(button, target) : button}
    {open && <aside id="account-panel" className="ja-account-panel" aria-label="Minha conta">
      <button type="button" className="ja-account-close" aria-label="Fechar minha conta" onClick={() => setOpen(false)}>×</button>
      <span className="ja-card-label">PLAYER CONECTADO</span>
      <UserAvatar user={user} large />
      <strong>{user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || 'Bem-vindo ao JOGAÊ'}</strong>
      <p>{user.email}</p>
      {error && <p className="ja-message" role="alert">{error}</p>}
      <button type="button" className="ja-primary ja-my-games" disabled={busy} onClick={() => { setOpen(false); onOpenGames(); }}>MINHA LISTA DE JOGOS</button>
      <button type="button" className="ja-primary" disabled={busy} onClick={logout}>{busy ? 'SAINDO...' : 'SAIR DA CONTA'}</button>
    </aside>}
  </>;
}
