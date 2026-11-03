import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect, useState } from 'react';
import Landing from './landing/Landing';
import './styles.css';

const Editor = lazy(() => import('./editor/Editor'));
const ProEditor = lazy(() => import('./pro/ProEditor'));
const AppsHub = lazy(() => import('./apps/AppsHub').then((m) => ({ default: m.AppsHub })));
const AppView = lazy(() => import('./apps/AppsHub').then((m) => ({ default: m.AppView })));

function App() {
  const [route, setRoute] = useState(() => location.hash);
  useEffect(() => {
    const on = () => { setRoute(location.hash); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const inPro = route.startsWith('#/pro');
  const appMatch = route.match(/^#\/apps\/([a-z0-9-]+)/);
  const inHub = route.startsWith('#/apps') && !appMatch;
  const inEditor = route.startsWith('#/editor') || inPro || !!appMatch;
  useEffect(() => {
    document.body.classList.toggle('in-editor', inEditor);
    document.body.classList.toggle('in-hub', inHub);
    if (appMatch) return;
    document.title = inHub ? 'Apps — Forma Studio' : inPro ? 'Forma Studio — Modo Pro' : inEditor ? 'Forma Studio — Editor' : 'Forma Studio — editor de imagens no navegador';
  }, [inEditor, inHub, !!appMatch]); // eslint-disable-line react-hooks/exhaustive-deps
  if (appMatch) {
    return (
      <Suspense fallback={<div className="boot"><span className="boot-dot" />Abrindo o app…</div>}>
        <AppView id={appMatch[1]} />
      </Suspense>
    );
  }
  if (inHub) {
    return (
      <Suspense fallback={<div className="boot"><span className="boot-dot" />Carregando os apps…</div>}>
        <AppsHub />
      </Suspense>
    );
  }
  if (inPro) {
    return (
      <Suspense fallback={<div className="boot"><span className="boot-dot" />Carregando o modo Pro…</div>}>
        <ProEditor goHome={() => { location.hash = ''; }} />
      </Suspense>
    );
  }
  if (inEditor) {
    return (
      <Suspense fallback={<div className="boot"><span className="boot-dot" />Carregando o editor…</div>}>
        <Editor goHome={() => { location.hash = ''; }} />
      </Suspense>
    );
  }
  return <Landing />;
}

createRoot(document.getElementById('root')!).render(<App />);
