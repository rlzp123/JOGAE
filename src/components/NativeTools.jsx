import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from '../lib/supabaseClient';

function isCancelled(error) {
  return /cancel|cancelled|canceled|no image picked/i.test(`${error?.code || ''} ${error?.message || ''}`);
}

export default function NativeTools() {
  const [photo, setPhoto] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
  return () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  };
}, []);
  const [message, setMessage] = useState('Escolha Câmera ou Galeria para começar.');
  const [tone, setTone] = useState('info');
  const fileInput = useRef(null);
  const videoRef = useRef(null);
const streamRef = useRef(null);
const [webcamOpen, setWebcamOpen] = useState(false);


  async function openWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    setWebcamOpen(true);
    setMessage('Webcam ligada! Agora você pode tirar a foto.');
    setTone('success');
  } catch (error) {
    setMessage('Não foi possível abrir a webcam. Verifique a permissão.');
    setTone('error');
  }
}

function closeWebcam() {
  streamRef.current?.getTracks().forEach(track => track.stop());
  streamRef.current = null;

  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }

  setWebcamOpen(false);
  setMessage('Webcam fechada. O JOGAÊ continua funcionando!');
  setTone('info');
}

async function takeWebcamPhoto() {
  const video = videoRef.current;

  if (!video || !video.videoWidth) {
    setMessage('Aguarde a webcam carregar.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg');

  setPhoto(imageData);
  closeWebcam();

  try {
    const response = await fetch(imageData);
    const blob = await response.blob();

    await uploadPhoto(blob);
  } catch (error) {
    setMessage(
      'Erro ao enviar foto: ' +
      (error?.message || 'Tente novamente.')
    );
    setTone('error');
  }
}

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0);

  setPhoto(canvas.toDataURL('image/jpeg'));
  closeWebcam();
  setMessage('Foto tirada com sucesso!');
  setTone('success');
}


  setUploadedUrl('');


  async function uploadPhoto(blob) {
  setMessage('Enviando foto para o Supabase...');
  setTone('info');

  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Faça login para enviar fotos.');
  }

  const extension =
    blob.type === 'image/png' ? 'png' :
    blob.type === 'image/webp' ? 'webp' : 'jpg';

  const fileName =
    `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from('fotos-camera')
    .upload(fileName, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from('fotos-camera')
    .getPublicUrl(fileName);

  setUploadedUrl(data.publicUrl);
  setMessage('Foto salva no Supabase com sucesso!');
  setTone('success');
}

  
async function choosePhoto() {
  if (busy) return;

  if (!Capacitor.isNativePlatform()) {
    fileInput.current?.click();
    return;
  }

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

const response = await fetch(image.webPath);

if (!response.ok) {
  throw new Error('Não foi possível preparar a foto.');
}

const blob = await response.blob();

await uploadPhoto(blob);
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
    <input
  ref={fileInput}
  type="file"
  accept="image/*"
  style={{ display: 'none' }}
  onChange={(event) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();

reader.onload = async () => {
  setPhoto(reader.result);

  try {
    await uploadPhoto(file);
  } catch (error) {
    setMessage(
      'Erro ao enviar foto: ' +
      (error?.message || 'Tente novamente.')
    );
    setTone('error');
  }
};

      reader.onerror = () => {
        setMessage('Não foi possível carregar a imagem.');
        setTone('error');
      };

      reader.readAsDataURL(file);
    } else {
      setMessage('Nenhuma imagem selecionada.');
    }

    event.target.value = '';
  }}
/>

{!Capacitor.isNativePlatform() && (
  <div style={{ marginBottom: '20px' }}>
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        display: webcamOpen ? 'block' : 'none',
        width: '100%',
        maxWidth: '480px',
        borderRadius: '12px',
        marginBottom: '12px'
      }}
    />

    {!webcamOpen ? (
      <button
        type="button"
        className="ja-camera-primary"
        onClick={openWebcam}
      >
        📷 Usar Webcam
      </button>
    ) : (
      <div className="ja-camera-actions">
        <button
          type="button"
          className="ja-camera-primary"
          onClick={takeWebcamPhoto}
        >
          📸 Tirar Foto
        </button>

        <button
          type="button"
          className="ja-camera-secondary"
          onClick={closeWebcam}
        >
          ✖ Cancelar
        </button>
      </div>
    )}
  </div>
)}
    
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
      {photo ? <img src={uploadedUrl || photo} alt="Pré-visualização da foto capturada ou escolhida" /> :
        <div className="ja-camera-placeholder"><span>🖼️</span><strong>Pré-visualização</strong><small>A sua foto aparecerá aqui</small></div>}




  {uploadedUrl && (
  <p style={{ marginTop: '12px' }}>
    ✅ Foto salva na nuvem!{' '}
    <a
      href={uploadedUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#f5bd40' }}
    >
      Ver foto no Supabase
    </a>
  </p>
)}

      
    </div>
  </section>;
}
