import { useEffect, useRef, useState } from 'react';

// O catálogo enviado anteriormente está disponível como build público.
// Ele usa seu próprio root React e é encerrado quando o usuário sai.
export default function OriginalCatalog() {
  const container = useRef(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let catalog;
    const url = new URL(`${import.meta.env.BASE_URL}catalogo/assets/index-Cu3K-SlQ.js`, document.baseURI).href;
    import(/* @vite-ignore */ url).then((module) => {
      if (active) catalog = module.mountCatalog(container.current);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (catalog) queueMicrotask(() => catalog.unmount()); };
  }, []);
  return error ? <main className="ja-catalog-error"><h1>Não foi possível abrir o catálogo.</h1><button className="ja-primary" onClick={() => window.location.reload()}>Tentar novamente</button></main> : <div ref={container} id="root" />;
}
