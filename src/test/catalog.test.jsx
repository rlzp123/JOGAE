import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

let root;
afterEach(() => {
  root?.unmount(); root = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

it('carrega o catálogo preservado e permite buscar os jogos', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const element = document.createElement('div');
  element.id = 'root'; document.body.append(element);
  const catalog = await import('../../public/catalogo/assets/index-Cu3K-SlQ.js');
  root = catalog.mountCatalog(element);
  await screen.findByRole('heading', { name: 'CATÁLOGO PREMIUM' });
  const input = screen.getByPlaceholderText('Buscar jogo...');
  fireEvent.change(input, { target: { value: 'jogo que não existe' } });
  await screen.findByText('Nenhum jogo encontrado.');
  fireEvent.change(input, { target: { value: 'ELDEN RING' } });
  await waitFor(() => expect(element.querySelectorAll('.game-card')).toHaveLength(1));
});
