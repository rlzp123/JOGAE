import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authError } from '../lib/authErrors';
import { isSupabaseConfigured, googleAuthEnabled } from '../lib/supabaseClient';
import AuthLayout from './AuthLayout';

const content = {
  login: ['BEM-VINDO DE VOLTA', 'Seu jogo continua.', 'Entre na sua conta e prepare o próximo play.', 'ENTRAR NA MINHA CONTA'],
  signup: ['NOVO PLAYER NA ÁREA', 'Comece sua jornada.', 'Crie sua conta e faça parte do universo JOGAÊ.', 'CRIAR MINHA CONTA'],
  reset: ['RECUPERE SEU ACESSO', 'Volte para o jogo.', 'Informe seu e-mail para receber o link de recuperação.', 'ENVIAR LINK DE RECUPERAÇÃO'],
  update: ['UM NOVO COMEÇO', 'Escolha uma nova senha.', 'Defina sua senha para voltar à sua conta.', 'SALVAR NOVA SENHA'],
};

function PasswordField({ id, label, value, onChange, isNew, disabled }) {
  const [visible, setVisible] = useState(false);
  return <label className="ja-field" htmlFor={id}>
    <span>{label}</span><div className="ja-input-wrap">
      <input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
        autoComplete={isNew ? 'new-password' : 'current-password'} minLength={isNew ? 8 : undefined}
        required placeholder={isNew ? 'Pelo menos 8 caracteres' : 'Digite sua senha'} disabled={disabled} />
      <button type="button" className="ja-show" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-pressed={visible} disabled={disabled}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg>
      </button>
    </div>
  </label>;
}

export default function AuthScreen() {
  const auth = useAuth();
  const [selectedMode, setMode] = useState('login');
  const mode = auth.recovery && auth.session ? 'update' : selectedMode;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState('error');
  const [kicker, title, subtitle, button] = content[mode];
  const creatingPassword = mode === 'signup' || mode === 'update';

  function changeMode(next) {
    setMode(next); setMessage(''); setPassword(''); setConfirm('');
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !isSupabaseConfigured) return;
    setMessage(''); setTone('error');
    if (mode === 'signup' && !name.trim()) { setMessage('Informe o seu nome.'); return; }
    if (creatingPassword && password !== confirm) { setMessage('As senhas não são iguais. Digite novamente.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { data, error } = await auth.signIn(email.trim(), password);
        if (error) throw error;
        if (!data?.session) throw new Error('Missing session');
      } else if (mode === 'signup') {
        const { data, error } = await auth.signUp(name, email.trim(), password);
        if (error) throw error;
        if (!data?.session) {
          setPassword(''); setConfirm(''); setMode('login'); setTone('success');
          setMessage('Confira seu e-mail para confirmar o cadastro. Depois, volte para entrar.');
        }
      } else if (mode === 'reset') {
        const { error } = await auth.resetPassword(email.trim());
        if (error) throw error;
        setTone('success'); setMessage('Se este e-mail possuir uma conta, você receberá um link para criar uma nova senha.');
      } else {
        const { error } = await auth.updatePassword(password);
        if (error) throw error;
        setPassword(''); setConfirm(''); auth.finishRecovery();
      }
    } catch (error) {
      if (mode === 'signup' && (error?.code === 'invalid_credentials' || /invalid login credentials/i.test(error?.message || ''))) {
        setMessage('O Supabase recusou esse cadastro. Confira se o e-mail já tem uma conta em Authentication > Users; se tiver, use a recuperação de senha.');
      } else {
        setMessage(authError(error));
      }
    }
    finally { setBusy(false); }
  }

  async function googleLogin() {
    if (busy) return;
    setBusy(true); setMessage(''); setTone('error');
    try {
      const { error } = await auth.signInGoogle();
      if (error) throw error;
    } catch (error) { setMessage(authError(error)); }
    finally { setBusy(false); }
  }

  return <AuthLayout><section className="ja-card" aria-labelledby="auth-title">
    <p className="ja-card-label">{kicker}</p>
    <h2 id="auth-title">{title}</h2>
    <p className="ja-card-sub">{subtitle}</p>
    {googleAuthEnabled && (mode === 'login' || mode === 'signup') && <>
      <button type="button" className="ja-google" onClick={googleLogin} disabled={busy || !isSupabaseConfigured}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.58-4.13H3.08v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.42 13.92a6.02 6.02 0 0 1 0-3.84V7.49H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.51l3.34-2.59Z" /><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.56 9.56 0 0 0 12 2a10 10 0 0 0-8.92 5.49l3.34 2.59A5.87 5.87 0 0 1 12 5.95Z" /></svg>
        Entrar com Google
      </button>
      <div className="ja-auth-divider"><span>ou use seu e-mail</span></div>
    </>}
    {(mode === 'login' || mode === 'signup') && <div className="ja-tabs" aria-label="Tipo de acesso">
      <button type="button" aria-pressed={mode === 'login'} disabled={busy} onClick={() => changeMode('login')}>Entrar</button>
      <button type="button" aria-pressed={mode === 'signup'} disabled={busy} onClick={() => changeMode('signup')}>Criar conta</button>
    </div>}
    {!isSupabaseConfigured && <p className="ja-message" role="alert">Configure a URL e a chave pública no arquivo .env.local e reinicie o projeto.</p>}
    {(message || auth.initialError) && <p className="ja-message" data-tone={message ? tone : 'error'} role={tone === 'success' ? 'status' : 'alert'}>{message || auth.initialError}</p>}
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy || !isSupabaseConfigured}>
        {mode === 'signup' && <label className="ja-field" htmlFor="name"><span>Como podemos te chamar?</span><input id="name" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" maxLength={80} required /></label>}
        {mode !== 'update' && <label className="ja-field" htmlFor="email"><span>E-mail</span><input id="email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" maxLength={254} required /></label>}
        {mode !== 'reset' && <PasswordField key={`${mode}-password`} id="password" label={mode === 'update' ? 'Nova senha' : 'Senha'} value={password} onChange={e => setPassword(e.target.value)} isNew={creatingPassword} disabled={busy} />}
        {creatingPassword && <PasswordField id="confirm-password" label="Confirmar senha" value={confirm} onChange={e => setConfirm(e.target.value)} isNew disabled={busy} />}
        {mode === 'login' && <div className="ja-forgot-row"><button type="button" className="ja-text-button" onClick={() => changeMode('reset')}>Esqueci minha senha</button></div>}
        <button type="submit" className="ja-primary">{busy ? 'AGUARDE...' : button}<span aria-hidden="true">→</span></button>
      </fieldset>
    </form>
    {mode === 'reset' && <button type="button" className="ja-back" disabled={busy} onClick={() => changeMode('login')}>← Voltar para o login</button>}
    <p className="ja-help ja-policy">{creatingPassword ? 'Use pelo menos 8 caracteres na sua nova senha.' : 'Sua sessão continua ativa quando você voltar.'}</p>
  </section></AuthLayout>;
}
