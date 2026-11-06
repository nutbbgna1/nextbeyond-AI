import { useEffect, useMemo, useState } from 'react';
import { defaultPage, pageFromHash } from './pages';
import './app.css';

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function legacyBaseUrl() {
  const configured = String(import.meta.env.VITE_LEGACY_BASE_URL || '').trim();
  if (configured) return trimSlash(configured);
  if (import.meta.env.DEV) return '/legacy';

  // ค่าเริ่มต้นสำหรับการวาง dist ไว้ที่ /AI/react-app/dist/
  const marker = '/react-app/';
  const index = window.location.pathname.indexOf(marker);
  if (index >= 0) return trimSlash(window.location.origin + window.location.pathname.slice(0, index));
  return trimSlash(window.location.origin + window.location.pathname.replace(/\/[^/]*$/, ''));
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [loaded, setLoaded] = useState(false);
  const page = useMemo(() => pageFromHash(hash), [hash]);
  const baseUrl = useMemo(legacyBaseUrl, []);
  const src = `${baseUrl}/${page.file}`;

  useEffect(() => {
    if (!window.location.hash) window.location.replace(`#/${defaultPage.slug}`);
    const onHashChange = () => {
      setLoaded(false);
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${page.title} · ผู้ช่วยครู AI`;
  }, [page.title]);

  return (
    <main className="react-shell">
      {!loaded && (
        <div className="loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          กำลังเปิด {page.title}…
        </div>
      )}
      <iframe
        key={src}
        className={loaded ? 'legacy-frame is-loaded' : 'legacy-frame'}
        src={src}
        title={page.title}
        onLoad={() => setLoaded(true)}
        allow="clipboard-read; clipboard-write"
      />
    </main>
  );
}
