import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

function isCancelled(error) {
  return /cancel|cancelled|canceled|no image picked/i.test(`${error?.code || ''} ${error?.message || ''}`);
}

export default function NativeTools() {
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Escolha Câmera ou Galeria para começar.');
  const [tone, setTone] = useState('info');

  async function choosePhoto() {
    if (busy) return;
    setBusy(true);
    setMessage('Aguardando escolha do Android…');
    setTone('info');
    try {
      if (Capacitor.isNativePlatform()) {
        // O Android solicita acesso à câmera quando necessário.
        // A galeria utiliza o seletor de fotos do sistema.
        const permission = await Camera.checkPermissions();
        if (permission.camera === 'denied') {
          setMessage('A câmera pode estar bloqueada; a Galeria ainda pode funcionar.');
        }
      }
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Tirar foto ou escolher imagem',
        promptLabelPicture: 'Câmera',
        promptLabelPhoto: 'Galeria',
      });
      if (!image.webPath) throw new Error('O Android não retornou uma imagem para mostrar.');
      setPhoto(image.webPath);
      setMessage('Imagem carregada! Você pode abrir a câmera novamente.');
      setTone('success');
    } catch (error) {
      // Voltar/Cancelar é normal e não apaga a imagem anterior.
      setMessage(isCancelled(error) ? 'Operação cancelada. O JOGAÊ continua funcionando!' :
        error?.message || 'Não foi possível obter a foto. Tente novamente.');
      setTone(isCancelled(error) ? 'info' : 'error');
    } finally {
      setBusy(false);
    }
  }

  async function requestCameraPermission() {
    try {
      const current = await Camera.checkPermissions();
      const result = current.camera === 'granted' ? current :
        await Camera.requestPermissions({ permissions: ['camera'] });
      setTone(result.camera === 'granted' ? 'success' : 'error');
      setMessage(result.camera === 'granted' ? 'Permissão de câmera liberada.' :
        'Permissão negada. Libere nas configurações do Android ou use a Galeria.');
    } catch (error) {
      setTone('error');
      setMessage(error?.message || 'Não foi possível verificar a permissão da câmera.');
    }
  }

  return <section className="ja-camera-demo" aria-label="Câmera e galeria do JOGAÊ">
    <div className="ja-camera-copy">
      <span className="ja-camera-kicker">📷 RECURSO NATIVO DO ANDROID</span>
      <h2>Seu momento no JOGAÊ</h2>
      <p>Abra a câmera ou escolha uma foto da galeria. A imagem aparece aqui na hora.</p>
      <div className="ja-camera-actions">
        <button type="button" className="ja-camera-primary" onClick={choosePhoto} disabled={busy}>
          {busy ? 'Aguardando imagem…' : '📷 Tirar Foto / Galeria'}
        </button>
        <button type="button" className="ja-camera-secondary" onClick={requestCameraPermission} disabled={busy}>
          Verificar permissão
        </button>
      </div>
      <p role="status" data-tone={tone} className="ja-camera-status">{message}</p>
    </div>
    <div className="ja-camera-preview">
      {photo ? <img src={photo} alt="Pré-visualização da foto capturada ou escolhida" /> :
        <div className="ja-camera-placeholder"><span>🖼️</span><strong>Pré-visualização</strong><small>A sua foto aparecerá aqui</small></div>}
    </div>
  </section>;
}
