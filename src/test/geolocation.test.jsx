import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Browser } from '@capacitor/browser';
import GeolocationTools from '../components/GeolocationTools';

vi.mock('@capacitor/core', () => ({ Capacitor: {
  isNativePlatform: vi.fn(), getPlatform: vi.fn(() => 'web'),
} }));
vi.mock('@capacitor/app', () => ({ App: {} }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }));
vi.mock('@capacitor/geolocation', () => ({ Geolocation: {
  checkPermissions: vi.fn(), requestPermissions: vi.fn(), getCurrentPosition: vi.fn(),
} }));

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  Capacitor.isNativePlatform.mockReturnValue(false);
  Capacitor.getPlatform.mockReturnValue('web');
  Geolocation.getCurrentPosition.mockResolvedValue({
    coords: { latitude: -23.55, longitude: -46.63, accuracy: 10 },
  });
});
afterEach(cleanup);

it('obtém a posição na web após consentimento e oferece o link correto', async () => {
  render(<GeolocationTools userId="player" />);
  expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Permitir localização' }));
  const link = await screen.findByRole('link', { name: 'Abrir no Google Maps' });
  expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-23.55,-46.63');
  expect(link).toHaveAttribute('target', '_blank');
  expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
  expect(Geolocation.checkPermissions).not.toHaveBeenCalled();
});

it('abre o Maps com Browser no app nativo após conceder permissão', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  Geolocation.checkPermissions.mockResolvedValue({ location: 'prompt' });
  Geolocation.requestPermissions.mockResolvedValue({ location: 'granted' });
  render(<GeolocationTools userId="player" />);
  fireEvent.click(screen.getByRole('button', { name: 'Permitir localização' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Abrir no Google Maps' }));
  await waitFor(() => expect(Browser.open).toHaveBeenCalledWith({
    url: 'https://www.google.com/maps/search/?api=1&query=-23.55,-46.63',
  }));
});

it('não captura posição quando o usuário recusa', () => {
  render(<GeolocationTools userId="player" />);
  fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
  expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'Abrir no Google Maps' })).not.toBeInTheDocument();
});

it.each([
  { latitude: null, longitude: null },
  { latitude: 91, longitude: 0 },
  { latitude: 0, longitude: 181 },
])('não oferece o Maps para coordenadas inválidas: %j', async (coords) => {
  Geolocation.getCurrentPosition.mockResolvedValue({ coords });
  render(<GeolocationTools userId="player" />);
  fireEvent.click(screen.getByRole('button', { name: 'Permitir localização' }));
  await screen.findByText(/O dispositivo retornou coordenadas inválidas/);
  expect(screen.queryByRole('link', { name: 'Abrir no Google Maps' })).not.toBeInTheDocument();
});
it('encaminha o GPS do catálogo para o fluxo único e mostra Maps no mesmo painel', async () => {
  const catalog = document.createElement('section');
  catalog.id = 'nativo';
  catalog.innerHTML = '<button class="native-button secondary-native"><span>📍</span>Ver GPS</button>';
  document.body.append(catalog);
  const legacyGps = vi.fn();
  catalog.querySelector('button').addEventListener('click', legacyGps);
  const { unmount } = render(<GeolocationTools userId="player" />);
  try {
    expect(catalog.querySelector('#jogae-location')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    fireEvent.click(catalog.querySelector('button span'));
    expect(legacyGps).not.toHaveBeenCalled();
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir localização' }));
    const link = await screen.findByRole('link', { name: 'Abrir no Google Maps' });
    expect(catalog).toContainElement(link);
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('#jogae-location')).toHaveLength(1);
    unmount();
    fireEvent.click(catalog.querySelector('button'));
    expect(legacyGps).toHaveBeenCalledTimes(1);
  } finally {
    unmount();
    catalog.remove();
  }
});
it('conecta o GPS do catálogo real montado de forma assíncrona', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const host = document.createElement('div');
  document.body.append(host);
  const tools = render(<GeolocationTools userId="player" />);
  let catalog;
  try {
    const module = await import('../../public/catalogo/assets/index-Cu3K-SlQ.js');
    await act(async () => { catalog = module.mountCatalog(host); });
    await waitFor(() => expect(host.querySelector('#nativo #jogae-location')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    fireEvent.click(host.querySelector('#nativo button.secondary-native'));
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir localização' }));
    const maps = await screen.findByRole('link', { name: 'Abrir no Google Maps' });
    expect(host.querySelector('#nativo')).toContainElement(maps);
    expect(screen.queryByText('Última localização')).not.toBeInTheDocument();
  } finally {
    tools.unmount();
    await act(async () => { catalog?.unmount(); });
    host.remove();
    vi.unstubAllGlobals();
  }
});