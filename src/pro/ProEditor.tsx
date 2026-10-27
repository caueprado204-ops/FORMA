import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Download, Images, Info, Loader, Shapes, TriangleAlert } from 'lucide-react';
import { Logo } from '../Logo';
import { Library, type LibraryTab } from '../editor/Library';
import type { Inserter } from '../editor/library-types';
import { colorize } from '../editor/elements';
import { setHandoff, takeHandoff } from '../handoff';

const PHOTOPEA = 'https://www.photopea.com';

// Configuração enviada ao Photopea (https://www.photopea.com/api/environment)
const CONFIG = {
  environment: {
    lang: 'pt',
    intro: true,
    vmode: 0,
    localsave: true,
  },
};

const b64url = (text: string) =>
  btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Abre a URL como camada (objeto inteligente) se houver documento aberto; senão, como documento novo. */
const openScript = (url: string) => {
  const u = JSON.stringify(url);
  return `var n=0;try{n=app.documents.length}catch(e){n=app.activeDocument?1:0}if(n>0){app.open(${u},null,true)}else{app.open(${u})}`;
};

export default function ProEditor({ goHome }: { goHome: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [lib, setLib] = useState<LibraryTab | null>('elementos');
  const [color, setColor] = useState('#7c5cff');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; at: number } | null>(null);
  const readyRef = useRef(false);
  const queue = useRef<(string | ArrayBuffer)[]>([]);
  const waitingFile = useRef<((b: ArrayBuffer | null) => void) | null>(null);

  const notify = (msg: string) => setToast({ msg, at: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const post = useCallback((msg: string | ArrayBuffer) => {
    const w = frame.current?.contentWindow;
    if (!w || !readyRef.current) { queue.current.push(msg); return; }
    w.postMessage(msg, PHOTOPEA);
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.origin !== PHOTOPEA) return;
      if (e.data instanceof ArrayBuffer) {
        waitingFile.current?.(e.data);
        waitingFile.current = null;
        return;
      }
      if (e.data === 'done' && !readyRef.current) {
        readyRef.current = true;
        setReady(true);
        // arte enviada pelo editor Forma
        const h = takeHandoff();
        if (h) h.blob.arrayBuffer().then((buf) => frame.current?.contentWindow?.postMessage(buf, PHOTOPEA, [buf]));
        queue.current.splice(0).forEach((m) => frame.current?.contentWindow?.postMessage(m, PHOTOPEA));
      }
    };
    window.addEventListener('message', onMsg);
    const t = setTimeout(() => { if (!readyRef.current) setSlow(true); }, 20000);
    return () => { window.removeEventListener('message', onMsg); clearTimeout(t); };
  }, []);

  /** Pede o documento aberto como PNG. */
  const exportPng = useCallback(() => new Promise<Blob | null>((resolve) => {
    const timer = setTimeout(() => { waitingFile.current = null; resolve(null); }, 20000);
    waitingFile.current = (buf) => { clearTimeout(timer); resolve(buf ? new Blob([buf], { type: 'image/png' }) : null); };
    post('app.activeDocument.saveToOE("png");');
  }), [post]);

  const download = async () => {
    setBusy('download');
    const blob = await exportPng();
    setBusy(null);
    if (!blob) return notify('Abra ou crie um documento no Photopea antes de baixar');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forma-pro.png';
    a.click();
    notify('PNG baixado');
  };

  const toForma = async () => {
    setBusy('forma');
    const blob = await exportPng();
    setBusy(null);
    if (!blob) return notify('Abra ou crie um documento no Photopea primeiro');
    setHandoff({ blob, name: 'Do modo Pro' });
    location.hash = '#/editor';
  };

  const inserter: Inserter = useMemo(() => ({
    image: (url, name) => {
      post(openScript(`${location.origin}/api/img?u=${encodeURIComponent(url)}`));
      notify(`Abrindo “${name.slice(0, 40)}” no Photopea…`);
    },
    element: (svgText, name, opts) => {
      let s = colorize(svgText, color);
      // elementos chegam grandes o bastante para não perder nitidez
      s = s.replace('<svg ', opts?.gradient ? '<svg width="2000" height="2000" preserveAspectRatio="none" ' : '<svg width="800" ');
      post(openScript(`${location.origin}/api/svg?d=${b64url(s)}`));
      notify(`Inserindo “${name}”…`);
    },
    color,
    setColor,
    canDrag: false,
  }), [post, color]);

  const src = useMemo(() => `${PHOTOPEA}#${encodeURIComponent(JSON.stringify(CONFIG))}`, []);

  return (
    <div className={`pro ${lib ? 'with-lib' : ''}`}>
      <header className="pro-top">
        <button className="brand" onClick={goHome} aria-label="Voltar ao site"><Logo size={26} /></button>
        <span className="pro-badge">Modo Pro</span>
        <span className="pro-via"><Info size={12} />Editor Photopea embutido</span>
        <span className="spacer" />
        <button className={`btn ghost sm ${lib === 'imagens' ? 'on' : ''}`} onClick={() => setLib(lib === 'imagens' ? null : 'imagens')}><Images size={14} />Imagens</button>
        <button className={`btn ghost sm ${lib === 'elementos' ? 'on' : ''}`} onClick={() => setLib(lib === 'elementos' ? null : 'elementos')}><Shapes size={14} />Elementos</button>
        <span className="vsep" />
        <button className="btn ghost sm" onClick={toForma} disabled={!ready || !!busy}>
          {busy === 'forma' ? <Loader size={14} className="spin" /> : <ArrowLeftRight size={14} />}Levar para o editor Forma
        </button>
        <button className="btn lime sm" onClick={download} disabled={!ready || !!busy}>
          {busy === 'download' ? <Loader size={14} className="spin" /> : <Download size={14} />}Baixar PNG
        </button>
      </header>
      <div className="pro-body">
        {lib && (
          <div className="pro-lib">
            <Library ins={inserter} tab={lib} onTab={setLib} onClose={() => setLib(null)} />
          </div>
        )}
        <div className="pro-frame">
          <iframe ref={frame} src={src} title="Photopea" allow="clipboard-read; clipboard-write; fullscreen" />
          {!ready && (
            <div className="pro-loading">
              {slow ? (
                <>
                  <TriangleAlert size={22} />
                  <b>O Photopea está demorando para abrir</b>
                  <span>Verifique a conexão ou se algum bloqueador está impedindo photopea.com. Você pode continuar no editor Forma.</span>
                  <a className="btn ghost sm" href="#/editor">Abrir o editor Forma</a>
                </>
              ) : (
                <><Loader size={20} className="spin" /><span>Carregando o Photopea…</span></>
              )}
            </div>
          )}
          <div className={`toast ${toast ? 'show' : ''}`}>{toast?.msg}</div>
        </div>
      </div>
    </div>
  );
}
