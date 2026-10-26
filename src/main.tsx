import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect, useState } from 'react';
import Landing from './landing/Landing';
import './styles.css';

const Editor = lazy(() => import('./editor/Editor'));

function App() {
  const [route, setRoute] = useState(() => location.hash);
  useEffect(() => {
    const on = () => { setRoute(location.hash); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const inEditor = route.startsWith('#/editor');
  useEffect(() => {
    document.body.classList.toggle('in-editor', inEditor);
    document.title = inEditor ? 'Forma Studio — Editor' : 'Forma Studio — editor de imagens no navegador';
  }, [inEditor]);
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
