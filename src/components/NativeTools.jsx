import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export default function NativeTools({ onToast }) {
  const [photo, setPhoto] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState('');

  async function openCamera() {
    setLoading('camera');
    try {
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 88,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });
        setPhoto(image.webPath || '');
        onToast('Câmera acessada pela ponte nativa do Capacitor.', 'success');
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Câmera indisponível neste navegador.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        onToast('No navegador foi usado getUserMedia. No Android, o Capacitor usa a API nativa.', 'info');
      }
    } catch (error) {
      onToast(error?.message || 'Não foi possível abrir a câmera.', 'error');
    } finally {
      setLoading('');
    }
  }

  async function readGPS() {
    setLoading('gps');
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();
        if (permission.location === 'denied') {
          throw new Error('Permissão de localização negada.');
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        setLocation(position.coords);
        onToast('GPS consultado pela ponte nativa do Capacitor.', 'success');
      } else {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error('Geolocalização indisponível.'));
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });
        setLocation(position.coords);
        onToast('No navegador foi usada a Geolocation API. No Android, o plugin usa o GPS nativo.', 'info');
      }
    } catch (error) {
      onToast(error?.message || 'Não foi possível obter a localização.', 'error');
    } finally {
      setLoading('');
    }
  }

  return (
    <section id="nativo" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
      <div className="native-panel reveal-card">
        <div className="max-w-2xl">
          <p className="section-kicker">CAPACITOR NATIVE BRIDGE</p>
          <h2 className="section-title mt-3">DO REACT PARA O <span>ANDROID</span></h2>
          <p className="mt-5 text-zinc-400 leading-7">
            Estes botões demonstram a ponte nativa. No Android, o JavaScript chama plugins do Capacitor, que conversam com as APIs do sistema operacional. No navegador, o projeto usa um fallback web para facilitar os testes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={openCamera} disabled={loading === 'camera'} className="native-button">
              <span>📷</span>{loading === 'camera' ? 'Abrindo...' : 'Abrir Câmera'}
            </button>
            <button onClick={readGPS} disabled={loading === 'gps'} className="native-button secondary-native">
              <span>📍</span>{loading === 'gps' ? 'Buscando...' : 'Ver GPS'}
            </button>
          </div>
        </div>

        <div className="bridge-visual" aria-label="Fluxo da ponte nativa">
          <div className="bridge-node">React / JS</div>
          <div className="bridge-line"><i /></div>
          <div className="bridge-node bridge-highlight">Capacitor Bridge</div>
          <div className="bridge-line"><i /></div>
          <div className="bridge-node">Android API</div>
        </div>
      </div>

      {(photo || location) && (
        <div className="native-results mt-6">
          {photo && (
            <div className="result-card">
              <span>Última foto</span>
              <img src={photo} alt="Foto tirada pela câmera" />
            </div>
          )}
          {location && (
            <div className="result-card p-5">
              <span>Última localização</span>
              <strong>Latitude: {location.latitude.toFixed(6)}</strong>
              <strong>Longitude: {location.longitude.toFixed(6)}</strong>
              <small>Precisão aproximada: {Math.round(location.accuracy)} m</small>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
