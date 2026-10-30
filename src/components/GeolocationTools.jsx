import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const LOCATION_CONSENT_KEY = 'jogae:location-consent';
const LAST_LOCATION_KEY = 'jogae:last-location';

function validCoordinates(coords) {
  return !!coords &&
    Number.isFinite(coords.latitude) && Math.abs(coords.latitude) <= 90 &&
    Number.isFinite(coords.longitude) && Math.abs(coords.longitude) <= 180;
}

export function clearLocationSessionState() {
  sessionStorage.removeItem(LOCATION_CONSENT_KEY);
  sessionStorage.removeItem(LAST_LOCATION_KEY);
}

export default function GeolocationTools({ userId }) {
  const [catalogTarget, setCatalogTarget] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openError, setOpenError] = useState('');
  const [permissionPrompt, setPermissionPrompt] = useState(false);
  const [manualInstructionsOpen, setManualInstructionsOpen] = useState(false);
  const [settingsAvailable, setSettingsAvailable] = useState(false);

  const hasValidCoordinates = validCoordinates(location);

  // The preserved catalog mounts asynchronously in its own React root.
  // Place the authenticated location controls beside its existing GPS button.
  useEffect(() => {
    const connect = () => setCatalogTarget(document.querySelector('#nativo'));
    const observer = new MutationObserver(connect);
    observer.observe(document.body, { childList: true, subtree: true });
    connect();
    return () => observer.disconnect();
  }, []);

  // Intercept the old handler before the catalog's separate React root captures
  // the click, so both entry points use the same consent and location.
  useEffect(() => {
    const requestFromCatalog = (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('#nativo button.native-button.secondary-native');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void handleGetLocation();
      document.getElementById('jogae-location')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    };
    document.addEventListener('click', requestFromCatalog, true);
    return () => document.removeEventListener('click', requestFromCatalog, true);
  });

  useEffect(() => {
    const consent = sessionStorage.getItem(LOCATION_CONSENT_KEY);
    const shouldPrompt = !consent && !!userId;
    setPermissionPrompt(shouldPrompt);
  }, [userId]);

  useEffect(() => {
    if (!location) {
      sessionStorage.removeItem(LAST_LOCATION_KEY);
      return;
    }

    sessionStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    const isAndroidNative = Capacitor.getPlatform() === 'android' && typeof App?.openUrl === 'function';
    setSettingsAvailable(isAndroidNative);
  }, []);

  async function requestLocationAccess() {
    setError('');
    setOpenError('');
    setManualInstructionsOpen(false);

    try {
      // On web, getCurrentPosition displays the browser permission prompt.
      if (Capacitor.isNativePlatform()) {
        const permissions = await Geolocation.checkPermissions();
        const hasPermission = permissions.location === 'granted' ||
          permissions.coarseLocation === 'granted';
        if (!hasPermission) {
          const requested = await Geolocation.requestPermissions();
          if (requested.location !== 'granted' && requested.coarseLocation !== 'granted') {
            setManualInstructionsOpen(true);
            setError('Configurações > Aplicativos > JOGAÊ > Permissões > Localização.');
            return;
          }
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const coords = position?.coords ?? {};
      const nextLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      };

      if (!validCoordinates(nextLocation)) {
        throw new Error('O dispositivo retornou coordenadas inválidas. Tente obter a localização novamente.');
      }
      setLocation(nextLocation);
      setPermissionPrompt(false);
      sessionStorage.setItem(LOCATION_CONSENT_KEY, 'allow');
    } catch (err) {
      setManualInstructionsOpen(true);
      setError(err?.message || 'Não foi possível obter a localização do dispositivo.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePermissionChoice(choice) {
    const decision = choice === 'allow' ? 'allow' : 'decline';
    sessionStorage.setItem(LOCATION_CONSENT_KEY, decision);
    setPermissionPrompt(false);

    if (choice === 'allow') {
      setLoading(true);
      await requestLocationAccess();
      return;
    }

    setLocation(null);
    sessionStorage.removeItem(LAST_LOCATION_KEY);
    setError('A localização pode ser ativada depois nas configurações do celular.');
    setManualInstructionsOpen(false);
  }

  async function handleGetLocation() {
    const consent = sessionStorage.getItem(LOCATION_CONSENT_KEY);

    if (!consent || consent === 'decline') {
      setPermissionPrompt(true);
      setError('A localização precisa ser ativada antes de capturar sua posição.');
      return;
    }

    setLoading(true);
    setError('');
    setOpenError('');
    await requestLocationAccess();
  }

  async function openInGoogleMaps(event) {
    if (!Capacitor.isNativePlatform()) return;
    event.preventDefault();
    if (!hasValidCoordinates) return;

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!validCoordinates(location)) {
      setOpenError('Coordenadas inválidas para abrir o Google Maps.');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    setOpenError('');

    try {
      await Browser.open({ url });
    } catch (err) {
      setOpenError(err?.message || 'Não foi possível abrir o Google Maps no momento.');
    }
  }

  async function openAppSettings() {
    if (!settingsAvailable) return;

    try {
      await App.openUrl({ url: 'app-settings:' });
    } catch (err) {
      setOpenError(err?.message || 'Não foi possível abrir as configurações do sistema.');
    }
  }

  const content = (
    <section
      id="jogae-location"
      style={{
        marginTop: '24px',
        padding: '20px',
        borderRadius: '16px',
        background: '#111217',
        border: '1px solid rgba(248, 196, 73, 0.35)',
        color: '#f5f5f6',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
      }}
      aria-label="Ferramentas de geolocalização do JOGAÊ"
    >
      {permissionPrompt && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            borderRadius: '14px',
            background: '#1a1b22',
            border: '1px solid rgba(248, 196, 73, 0.4)',
          }}
          role="dialog"
          aria-live="polite"
        >
          <h4 style={{ margin: '0 0 8px', color: '#f8c449' }}>Permissão de localização</h4>
          <p style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
            O JOGAÊ precisa da sua autorização para utilizar a localização. Você pode permitir agora ou ativar depois nas configurações do celular.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handlePermissionChoice('allow')}
              style={{
                flex: '1 1 180px',
                border: '1px solid #f8c449',
                background: '#f8c449',
                color: '#111217',
                borderRadius: '10px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Permitir localização
            </button>
            <button
              type="button"
              onClick={() => handlePermissionChoice('decline')}
              style={{
                flex: '1 1 180px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#15161d',
                color: '#f5f5f6',
                borderRadius: '10px',
                padding: '10px 14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Agora não
            </button>
          </div>
          <p style={{ marginTop: '12px', color: '#d1d5db', fontSize: '0.9rem', lineHeight: 1.5 }}>
            O Android pode guardar a permissão entre sessões. O aviso nativo pode não aparecer em todos os logins.
          </p>
        </div>
      )}

      <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', color: '#f8c449' }}>📍 Localização</h3>

      <button
        type="button"
        onClick={handleGetLocation}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid #f8c449',
          background: loading ? '#2a2b34' : '#f8c449',
          color: loading ? '#d1d5db' : '#111217',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '12px',
        }}
      >
        {loading ? 'Obtendo localização...' : 'Ver GPS'}
      </button>

      {error && (
        <p role="alert" style={{ color: '#fca5a5', margin: '0 0 12px', lineHeight: 1.5 }}>
          {error}
        </p>
      )}

      {manualInstructionsOpen && (
        <div
          style={{
            marginBottom: '12px',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(248, 196, 73, 0.3)',
            background: '#15161d',
          }}
        >
          <p style={{ margin: '0 0 8px', color: '#f8c449', fontWeight: 700 }}>
            Como ativar manualmente
          </p>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Configurações &gt; Aplicativos &gt; JOGAÊ &gt; Permissões &gt; Localização.
          </p>
          {settingsAvailable && (
            <button
              type="button"
              onClick={openAppSettings}
              style={{
                marginTop: '10px',
                width: '100%',
                borderRadius: '10px',
                border: '1px solid #f8c449',
                background: '#111217',
                color: '#f8c449',
                padding: '10px 12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Abrir configurações
            </button>
          )}
        </div>
      )}

      {location && (
        <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: '#f8c449' }}>Latitude:</strong> {location.latitude}
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: '#f8c449' }}>Longitude:</strong> {location.longitude}
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: '#f8c449' }}>Precisão:</strong> {location.accuracy} m
          </p>

          {hasValidCoordinates && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={openInGoogleMaps}
              style={{
                marginTop: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #f8c449',
                background: '#f8c449',
                color: '#111217',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Abrir no Google Maps
            </a>
          )}


        </div>
      )}
      {openError && (
        <p role="alert" style={{ color: '#fca5a5', margin: '8px 0 0' }}>
          {openError}
        </p>
      )}
    </section>
  );

  return catalogTarget ? createPortal(content, catalogTarget) : content;
}
