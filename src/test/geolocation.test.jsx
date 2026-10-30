import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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