import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyGamesCRUD from '../components/MyGamesCRUD';

const service = vi.hoisted(() => ({ listGames: vi.fn(), saveGame: vi.fn(), deleteGame: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'player-1' } }) }));
vi.mock('../lib/gamesService', async () => {
  const actual = await vi.importActual('../lib/gamesService');
  return { ...actual, ...service };
});

beforeEach(() => {
  vi.resetAllMocks();
  service.listGames.mockResolvedValue({ data: [], error: null });
  if (!HTMLDialogElement.prototype.showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () { this.setAttribute('open', ''); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('consulta os jogos do usuário ativo, cadastra, edita e remove', async () => {
  const user = userEvent.setup(); render(<MyGamesCRUD onClose={vi.fn()} />);
  await screen.findByText('Você ainda não adicionou jogos.');
  expect(service.listGames).toHaveBeenCalledWith('player-1');
  const game = { id: 'game-1', titulo: 'Minecraft', plataforma: 'PC', status: 'Quero jogar' };
  service.saveGame.mockResolvedValueOnce({ data: game, error: null });
  await user.type(screen.getByLabelText('Nome do jogo'), 'Minecraft');
  await user.click(screen.getByRole('button', { name: 'ADICIONAR JOGO' }));
  expect(await screen.findByText('Minecraft')).toBeInTheDocument();
  expect(service.saveGame).toHaveBeenCalledWith('player-1', { titulo: 'Minecraft', plataforma: 'PC', status: 'Quero jogar' }, null);
  await user.click(screen.getByRole('button', { name: 'Editar Minecraft' }));
  await user.selectOptions(screen.getByLabelText('Status'), 'Concluído');
  service.saveGame.mockResolvedValueOnce({ data: { ...game, status: 'Concluído' }, error: null });
  await user.click(screen.getByRole('button', { name: 'SALVAR ALTERAÇÕES' }));
  expect(await screen.findByText('PC · Concluído')).toBeInTheDocument();
  expect(service.saveGame).toHaveBeenLastCalledWith('player-1', { titulo: 'Minecraft', plataforma: 'PC', status: 'Concluído' }, 'game-1');
  await user.click(screen.getByRole('button', { name: 'Remover Minecraft' }));
  expect(service.deleteGame).not.toHaveBeenCalled();
  service.deleteGame.mockResolvedValue({ data: { id: 'game-1' }, error: null });
  await user.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
  await waitFor(() => expect(screen.queryByText('Minecraft')).not.toBeInTheDocument());
  expect(service.deleteGame).toHaveBeenCalledWith('player-1', 'game-1');
});

it('mantém o formulário disponível depois de falha ao salvar', async () => {
  const user = userEvent.setup(); render(<MyGamesCRUD onClose={vi.fn()} />);
  await screen.findByText('Você ainda não adicionou jogos.');
  await user.type(screen.getByLabelText('Nome do jogo'), 'Zelda');
  service.saveGame.mockRejectedValue(new Error('Network failure'));
  await user.click(screen.getByRole('button', { name: 'ADICIONAR JOGO' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confira sua conexão');
  expect(screen.getByRole('button', { name: 'ADICIONAR JOGO' })).toBeEnabled();
  expect(screen.getByLabelText('Nome do jogo')).toHaveValue('Zelda');
});
