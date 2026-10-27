import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';

const mocked = vi.hoisted(() => ({
  listener: null,
  auth: {
    getSession: vi.fn(), onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), signInWithOAuth: vi.fn(),
  },
}));
vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: mocked.auth }, isSupabaseConfigured: true, googleAuthEnabled: true,
  redirectUrl: (recovery) => recovery ? 'http://localhost:5173/?auth=recovery' : 'http://localhost:5173/',
}));
vi.mock('../components/OriginalCatalog', () => ({ default: () => <main>Catálogo protegido</main> }));
vi.mock('../lib/gamesService', () => ({
  listGames: async () => ({ data: [], error: null }),
  saveGame: vi.fn(), deleteGame: vi.fn(), gamesError: () => 'Falha ao carregar.',
}));

const session = { access_token: 'test-only', user: { id: 'player-1', email: 'ryan@example.com', user_metadata: { full_name: 'Ryan' } } };
function renderApp() { return render(<AuthProvider><App /></AuthProvider>); }
async function signInForm(user, password = 'Senha123!') {
  await user.type(screen.getByLabelText('E-mail'), 'ryan@example.com');
  await user.type(screen.getByLabelText('Senha', { exact: true }), password);
}

beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); window.history.replaceState({}, '', '/');
  mocked.listener = null;
  mocked.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocked.auth.onAuthStateChange.mockImplementation(callback => {
    mocked.listener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
});
afterEach(cleanup);

describe('Acesso ao JOGAÊ', () => {
  it('fecha a tela do CRUD quando a sessão é encerrada', async () => {
    const user = userEvent.setup();
    mocked.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    renderApp(); await screen.findByText('Catálogo protegido');
    await user.click(screen.getByRole('button', { name: 'Minha conta' }));
    await user.click(screen.getByRole('button', { name: 'MINHA LISTA DE JOGOS' }));
    await screen.findByRole('dialog', { name: 'Minha lista de jogos' });
    act(() => mocked.listener('SIGNED_OUT', null));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Seu jogo continua.' })).toBeInTheDocument();
  });
  it('dispara OAuth com Google e mostra o perfil após o retorno', async () => {
    const user = userEvent.setup(); renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    mocked.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/test-only' }, error: null });
    await user.click(screen.getByRole('button', { name: 'Entrar com Google' }));
    expect(mocked.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'http://localhost:5173/' } });
    const googleSession = { ...session, user: { ...session.user, user_metadata: { full_name: 'Ryan Google', avatar_url: 'https://example.com/avatar.png' } } };
    act(() => mocked.listener('SIGNED_IN', googleSession));
    await screen.findByText('Catálogo protegido');
    expect(screen.getByRole('img', { name: 'Foto de Ryan Google' })).toHaveAttribute('src', 'https://example.com/avatar.png');
    await user.click(screen.getByRole('button', { name: 'Minha conta' }));
    expect(screen.getByText('Ryan Google')).toBeInTheDocument();
    expect(screen.getByText('ryan@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MINHA LISTA DE JOGOS' })).toBeInTheDocument();
  });

  it('permite repetir o login Google quando o provedor responde com erro', async () => {
    const user = userEvent.setup(); renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    mocked.auth.signInWithOAuth.mockResolvedValue({ error: { message: 'Unsupported provider: provider is not enabled' } });
    await user.click(screen.getByRole('button', { name: 'Entrar com Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Google ainda não foi ativado');
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled();
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
  });
  it('mantém o catálogo fechado sem sessão e restaura a sessão ao voltar', async () => {
    const first = renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
    first.unmount();
    mocked.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    renderApp();
    expect(await screen.findByText('Catálogo protegido')).toBeInTheDocument();
  });

  it('mostra erros sem liberar o catálogo e permite tentar novamente', async () => {
    const user = userEvent.setup(); renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    mocked.auth.signInWithPassword.mockResolvedValueOnce({ error: { code: 'invalid_credentials' } });
    await signInForm(user);
    await user.click(screen.getByRole('button', { name: /ENTRAR NA MINHA CONTA/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ENTRAR NA MINHA CONTA/ })).toBeEnabled();
  });

  it('abre o catálogo após entrar e retorna ao login quando o usuário sai', async () => {
    const user = userEvent.setup(); renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    mocked.auth.signInWithPassword.mockImplementation(async () => {
      mocked.listener('SIGNED_IN', session); return { data: { session }, error: null };
    });
    mocked.auth.signOut.mockImplementation(async () => { mocked.listener('SIGNED_OUT', null); return { error: null }; });
    await signInForm(user);
    await user.click(screen.getByRole('button', { name: /ENTRAR NA MINHA CONTA/ }));
    expect(await screen.findByText('Catálogo protegido')).toBeInTheDocument();
    expect(mocked.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ryan@example.com', password: 'Senha123!' });
    await user.click(screen.getByRole('button', { name: /Minha conta/ }));
    expect(screen.getByText('Ryan')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'SAIR DA CONTA' }));
    expect(await screen.findByRole('heading', { name: 'Seu jogo continua.' })).toBeInTheDocument();
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
  });

  it('valida a confirmação de senha antes de cadastrar e orienta a confirmação por e-mail', async () => {
    const user = userEvent.setup(); renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    await user.type(screen.getByLabelText('Como podemos te chamar?'), 'Ryan');
    await signInForm(user);
    await user.type(screen.getByLabelText('Confirmar senha', { exact: true }), 'Outra123!');
    await user.click(screen.getByRole('button', { name: /CRIAR MINHA CONTA/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('As senhas não são iguais');
    expect(mocked.auth.signUp).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Confirmar senha', { exact: true }));
    await user.type(screen.getByLabelText('Confirmar senha', { exact: true }), 'Senha123!');
    mocked.auth.signUp.mockResolvedValue({ data: { session: null, user: session.user }, error: null });
    await user.click(screen.getByRole('button', { name: /CRIAR MINHA CONTA/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('Confira seu e-mail');
    expect(mocked.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ data: { full_name: 'Ryan', display_name: 'Ryan' } }),
    }));
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
  });

  it('envia o link de recuperação com endereço de retorno', async () => {
    const user = userEvent.setup(); renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    await user.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await user.type(screen.getByLabelText('E-mail'), 'ryan@example.com');
    mocked.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await user.click(screen.getByRole('button', { name: /ENVIAR LINK/ }));
    expect(await screen.findByRole('status')).toHaveTextContent('você receberá um link');
    expect(mocked.auth.resetPasswordForEmail).toHaveBeenCalledWith('ryan@example.com', { redirectTo: 'http://localhost:5173/?auth=recovery' });
  });

  it('abre nova senha no evento de recuperação, inclusive após recarregar a página', async () => {
    const user = userEvent.setup(); const view = renderApp();
    await screen.findByRole('heading', { name: 'Seu jogo continua.' });
    act(() => mocked.listener('PASSWORD_RECOVERY', session));
    expect(screen.getByRole('heading', { name: 'Escolha uma nova senha.' })).toBeInTheDocument();
    expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument();
    view.unmount(); mocked.auth.getSession.mockResolvedValue({ data: { session }, error: null });
    renderApp();
    await screen.findByRole('heading', { name: 'Escolha uma nova senha.' });
    await user.type(screen.getByLabelText('Nova senha', { exact: true }), 'NovaSenha123!');
    await user.type(screen.getByLabelText('Confirmar senha', { exact: true }), 'NovaSenha123!');
    mocked.auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null });
    await user.click(screen.getByRole('button', { name: /SALVAR NOVA SENHA/ }));
    expect(await screen.findByText('Catálogo protegido')).toBeInTheDocument();
    expect(mocked.auth.updateUser).toHaveBeenCalledWith({ password: 'NovaSenha123!' });
    expect(sessionStorage.getItem('jogae:password-recovery')).toBeNull();
  });

  it('mantém a conta aberta e exibe erro se a saída falhar', async () => {
    const user = userEvent.setup(); mocked.auth.getSession.mockResolvedValue({ data: { session }, error: null }); renderApp();
    await screen.findByText('Catálogo protegido');
    await user.click(screen.getByRole('button', { name: /Minha conta/ }));
    mocked.auth.signOut.mockResolvedValue({ error: { message: 'Network error' } });
    await user.click(screen.getByRole('button', { name: 'SAIR DA CONTA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira sua internet');
    expect(screen.getByText('Catálogo protegido')).toBeInTheDocument();
  });

  it('não restaura uma sessão antiga após receber o evento de saída', async () => {
    let finish;
    mocked.auth.getSession.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    renderApp();
    act(() => mocked.listener('SIGNED_OUT', null));
    await act(async () => finish({ data: { session }, error: null }));
    await waitFor(() => expect(screen.queryByText('Catálogo protegido')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Seu jogo continua.' })).toBeInTheDocument();
  });
});
