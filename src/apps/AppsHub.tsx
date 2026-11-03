import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Aperture, ArrowLeft, AudioLines, Box, ChevronDown, Clapperboard, Cpu, DraftingCompass, ExternalLink, FileText,
  FileType, Frame, Image, LayoutGrid, LayoutTemplate, Loader, Maximize2, PenTool, Presentation, Search, Sheet,
  TriangleAlert, WandSparkles, Download, Palette,
} from 'lucide-react';
import { Logo } from '../Logo';
import CATALOG from './catalog.json';

export type CraftApp = (typeof CATALOG.apps)[number];
type Manifest = { apps: Record<string, { available: boolean; version?: string; bytes?: number; error?: string }> };

const ICONS: Record<string, typeof Image> = {
  Image, PenTool, Aperture, Frame, Clapperboard, WandSparkles, AudioLines, LayoutTemplate, FileType, FileText, Sheet,
  Presentation, DraftingCompass, Box,
};

export const APPS = CATALOG.apps;
const CATS = [
  { id: 'imagem', label: 'Imagem e design' },
  { id: 'video', label: 'Vídeo e áudio' },
  { id: 'documentos', label: 'Documentos e escritório' },
] as const;

export function AppIcon({ app, size = 44 }: { app: { icon: string; color: string }; size?: number }) {
  const I = ICONS[app.icon] || LayoutGrid;
  return (
    <span className="app-ico" style={{ width: size, height: size, ['--c' as any]: app.color }}>
      <I size={Math.round(size * 0.5)} strokeWidth={1.8} />
    </span>
  );
}

let manifestPromise: Promise<Manifest | null> | null = null;
export function loadManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch('/apps/manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .catch(() => null);
  }
  return manifestPromise;
}

const open = (id: string) => { location.hash = `#/apps/${id}`; };

// ───────────────────────── hub ─────────────────────────
export function AppsHub() {
  const [q, setQ] = useState('');
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  useEffect(() => { loadManifest().then(setManifest); }, []);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = APPS.filter((a) => !q || norm(`${a.name} ${a.like} ${a.desc} ${a.upstream}`).includes(norm(q)));
  const status = (id: string) => (manifest === undefined ? 'loading' : !manifest ? 'unknown' : manifest.apps[id]?.available ? 'ok' : 'off');

  return (
    <div className="hub">
      <header className="hub-top">
        <a className="brand" href="#" aria-label="Página inicial"><Logo size={28} word /></a>
        <nav className="hub-nav">
          <a href="#/editor"><Palette size={15} />Editor Forma</a>
          <a className="on" href="#/apps"><LayoutGrid size={15} />Apps</a>
        </nav>
        <div className="hub-search">
          <Search size={15} />
          <input id="hub-q" placeholder="Buscar apps (ex.: vídeo, pdf, planilha)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <section className="hub-hero">
        <span className="kicker">Suíte Forma</span>
        <h1>Todos os seus apps criativos, no navegador.</h1>
        <p>Foto, vetor, vídeo, motion, áudio, diagramação, PDF, texto, planilha, slides e CAD. Tudo abre aqui dentro, sem instalar, e seus arquivos ficam no seu computador.</p>
      </section>

      {CATS.map((c) => {
        const items = list.filter((a) => a.category === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} className="hub-sec">
            <h2>{c.label}</h2>
            <div className="hub-grid">
              {items.map((a) => {
                const s = status(a.id);
                return (
                  <button key={a.id} className={`app-card ${s === 'off' ? 'off' : ''}`} onClick={() => open(a.id)} style={{ ['--c' as any]: a.color }}>
                    <AppIcon app={a} />
                    <span className="app-card-body">
                      <b>{a.name}</b>
                      <small>Como o {a.like}</small>
                      <span className="app-card-desc">{a.desc}</span>
                    </span>
                    <span className="app-card-foot">
                      {s === 'ok' && <span className="pill ok">v{manifest!.apps[a.id].version}</span>}
                      {s === 'off' && <span className="pill">Indisponível agora</span>}
                      {s === 'unknown' && <span className="pill">Na versão publicada</span>}
                      <span className="app-open">Abrir →</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {!q && (
        <section className="hub-sec">
          <h2>Só para computador</h2>
          <div className="hub-grid">
            {CATALOG.desktopOnly.map((a) => (
              <a key={a.id} className="app-card" href={`https://github.com/${a.repo}/releases/latest`} target="_blank" rel="noreferrer" style={{ ['--c' as any]: a.color }}>
                <AppIcon app={a} />
                <span className="app-card-body">
                  <b>{a.name}</b>
                  <small>Como o {a.like}</small>
                  <span className="app-card-desc">{a.desc}</span>
                </span>
                <span className="app-card-foot"><span className="pill">Windows · Linux</span><span className="app-open"><Download size={13} /> Baixar</span></span>
              </a>
            ))}
          </div>
        </section>
      )}

      {!list.length && <p className="hub-empty">Nenhum app encontrado para “{q}”.</p>}

      <footer className="hub-foot">
        Os apps da suíte rodam as versões web oficiais dos projetos de código aberto da família Craft
        ({APPS.map((a) => a.upstream).join(', ')}), sob licença MIT ou Apache-2.0. Cada app mantém a própria interface e marca;
        a Forma não é afiliada aos autores. Funciona melhor no Chrome ou Edge no computador.
      </footer>
    </div>
  );
}

// ───────────────────────── app aberto ─────────────────────────
export function AppView({ id }: { id: string }) {
  const app = APPS.find((a) => a.id === id);
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [menu, setMenu] = useState(false);
  const [renderer, setRenderer] = useState<'' | 'webgl' | 'cpu'>(() => {
    try { return (localStorage.getItem('forma.apps.renderer') as '' | 'webgl' | 'cpu') || ''; } catch { return ''; }
  });
  const frame = useRef<HTMLIFrameElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => { loadManifest().then(setManifest); }, []);
  useEffect(() => { setLoaded(false); setMenu(false); }, [id, renderer]);
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.appbar-switch')) setMenu(false); };
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [menu]);
  useEffect(() => { document.title = app ? `${app.name} — Forma` : 'Forma Apps'; }, [app]);

  if (!app) return <AppsHub />;
  const info = manifest?.apps[app.id];
  const src = `/apps/${app.id}/${renderer ? `?${renderer}` : ''}`;
  const unavailable = manifest === null || (manifest && !info?.available);

  return (
    <div className="appview" style={{ ['--c' as any]: app.color }}>
      <header className="appbar">
        <a className="brand" href="#/apps" aria-label="Voltar para os apps"><Logo size={26} /></a>
        <a className="iconbtn" href="#/apps" data-tip="Todos os apps" aria-label="Todos os apps"><ArrowLeft size={16} /></a>
        <div className="appbar-switch">
          <button className="appbar-title" onClick={() => setMenu(!menu)} aria-expanded={menu}>
            <AppIcon app={app} size={26} />
            <span><b>{app.name}</b><small>{app.like}{info?.version ? ` · v${info.version}` : ''}</small></span>
            <ChevronDown size={14} />
          </button>
          {menu && (
            <div className="appbar-menu">
              {APPS.map((a) => (
                <a key={a.id} href={`#/apps/${a.id}`} className={a.id === app.id ? 'on' : ''}>
                  <AppIcon app={a} size={30} />
                  <span><b>{a.name}</b><small>{a.like}</small></span>
                </a>
              ))}
              <a href="#/editor" className="appbar-menu-forma"><Palette size={16} />Editor Forma</a>
            </div>
          )}
        </div>
        <span className="spacer" />
        <label className="appbar-renderer" data-tip="Se a tela ficar preta ou travar, troque para WebGL ou CPU">
          <Cpu size={14} />
          <select value={renderer} onChange={(e) => {
            const v = e.target.value as '' | 'webgl' | 'cpu';
            setRenderer(v);
            try { localStorage.setItem('forma.apps.renderer', v); } catch { /* ignora */ }
          }}>
            <option value="">Automático</option>
            <option value="webgl">WebGL</option>
            <option value="cpu">CPU (compatível)</option>
          </select>
        </label>
        <button className="iconbtn" data-tip="Tela cheia" aria-label="Tela cheia" onClick={() => wrap.current?.requestFullscreen?.().catch(() => {})}><Maximize2 size={15} /></button>
        <a className="iconbtn" href={src} target="_blank" rel="noreferrer" data-tip="Abrir em nova aba" aria-label="Abrir em nova aba"><ExternalLink size={15} /></a>
      </header>
      <div className="appframe" ref={wrap}>
        {unavailable ? (
          <div className="app-state">
            <TriangleAlert size={24} />
            <b>{manifest === null ? `${app.name} funciona na versão publicada do site` : `${app.name} não está disponível agora`}</b>
            <span>{manifest === null
              ? 'Os apps são instalados no site durante a publicação na Vercel. Abra o Forma pelo endereço publicado para usar.'
              : 'O pacote web deste app não foi baixado na última publicação. Ele volta na próxima publicação do site.'}</span>
            <a className="btn ghost sm" href="#/apps">Ver outros apps</a>
          </div>
        ) : (
          <>
            {manifest && <iframe key={src} ref={frame} src={src} title={app.name} allow="fullscreen; clipboard-read; clipboard-write" allowFullScreen onLoad={() => setTimeout(() => setLoaded(true), 600)} />}
            {!loaded && (
              <div className="app-state loading">
                <AppIcon app={app} size={64} />
                <b>Abrindo {app.name}…</b>
                <span>{info?.bytes ? `Baixando ${(info.bytes / 1048576).toFixed(0)} MB na primeira vez. Depois abre na hora.` : 'Preparando o app.'}</span>
                <Loader size={18} className="spin" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Lançador compacto (grade de apps) para usar no editor. */
export function AppsLauncher() {
  const [openMenu, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openMenu) return;
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [openMenu]);
  const apps = useMemo(() => APPS, []);
  return (
    <div className="launcher" ref={ref}>
      <button className="iconbtn" data-tip="Apps Forma" aria-label="Apps Forma" onClick={() => setOpen(!openMenu)}><LayoutGrid size={16} /></button>
      {openMenu && (
        <div className="launcher-pop">
          <div className="launcher-grid">
            {apps.map((a) => (
              <a key={a.id} href={`#/apps/${a.id}`} onClick={() => setOpen(false)}>
                <AppIcon app={a} size={40} />
                <span>{a.name.replace('Forma ', '')}</span>
              </a>
            ))}
          </div>
          <a className="launcher-all" href="#/apps">Ver todos os apps</a>
        </div>
      )}
    </div>
  );
}
