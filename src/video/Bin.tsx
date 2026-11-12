import { useMemo, useRef, useState } from 'react';
import { Film, Music, Image as ImageIcon, Upload, Search, Type, Square, Trash2, Sparkles, Shuffle, Plus, LayoutGrid, List } from 'lucide-react';
import { type Media, TRANSITIONS, timecode } from './model';
import { store, useStore } from './store';
import { addColorMatte, addTitle, importAndPlace, importFiles, placeMedia, removeMedia, transitionAtPlayhead } from './actions';
import { FX_MIME, MEDIA_MIME } from './Timeline';
import { Library, type LibraryTab } from '../editor/Library';
import type { Inserter } from '../editor/library-types';
import { colorize } from '../editor/elements';

const fmtSize = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
const ICON = { video: Film, audio: Music, image: ImageIcon };

function MediaItem({ m, grid }: { m: Media; grid: boolean }) {
  const s = useStore();
  const I = ICON[m.kind];
  const used = s.seq.tracks.some((t) => t.clips.some((c) => c.media === m.id));
  const offline = !s.urls.has(m.id);
  return (
    <div className={`bin-item ${grid ? 'grid' : ''} ${offline ? 'offline' : ''}`} draggable={!offline}
      onDragStart={(e) => { e.dataTransfer.setData(MEDIA_MIME, m.id); e.dataTransfer.effectAllowed = 'copy'; }}
      onDoubleClick={() => !offline && placeMedia(m)}
      title={offline ? 'Arquivo não encontrado neste navegador. Importe de novo.' : 'Arraste para a linha do tempo ou clique duas vezes para inserir no indicador'}>
      <span className="bin-thumb">
        {m.thumbs?.[0] ? <img src={m.thumbs[Math.floor((m.thumbs.length - 1) / 2)]} alt="" /> : <I size={grid ? 26 : 16} />}
        {m.kind !== 'image' && <span className="bin-dur">{timecode(Math.round(m.duration * s.seq.fps), s.seq.fps).slice(3, 8)}</span>}
      </span>
      <span className="bin-meta">
        <b className="ellip">{m.name}</b>
        <small>{offline ? 'Mídia offline' : [m.kind === 'video' ? `${m.width}×${m.height}` : m.kind === 'image' ? `${m.width}×${m.height}` : 'Áudio', fmtSize(m.size)].join(' · ')}{used ? ' · em uso' : ''}</small>
      </span>
      <span className="bin-actions">
        {!offline && <button className="iconbtn" onClick={() => placeMedia(m)} data-tip="Inserir no indicador" aria-label="Inserir no indicador"><Plus size={13} /></button>}
        <button className="iconbtn" onClick={() => removeMedia(m.id)} data-tip="Remover do projeto" aria-label="Remover do projeto"><Trash2 size={13} /></button>
      </span>
    </div>
  );
}

function ProjectTab() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [grid, setGrid] = useState(true);
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const list = [...s.media.values()].filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className={`bin ${over ? 'over' : ''}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); importFiles(Array.from(e.dataTransfer.files)); }}>
      <div className="bin-bar">
        <div className="bin-search"><Search size={13} /><input placeholder="Buscar mídia" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
        <button className={`iconbtn ${grid ? 'on' : ''}`} onClick={() => setGrid(true)} aria-label="Ícones"><LayoutGrid size={14} /></button>
        <button className={`iconbtn ${!grid ? 'on' : ''}`} onClick={() => setGrid(false)} aria-label="Lista"><List size={14} /></button>
      </div>
      <div className={`bin-list ${grid ? 'grid' : ''}`}>
        {list.map((m) => <MediaItem key={m.id} m={m} grid={grid} />)}
        {!s.media.size && (
          <button className="bin-empty" onClick={() => file.current?.click()}>
            <Upload size={26} />
            <b>Importe vídeos, músicas e imagens</b>
            <span>Arraste arquivos para cá ou clique. MP4, MOV, WebM, MP3, WAV, PNG, JPG…</span>
          </button>
        )}
      </div>
      <div className="bin-foot">
        <button className="btn primary sm" onClick={() => file.current?.click()}><Upload size={13} />Importar</button>
        <span className="muted small">{s.media.size} {s.media.size === 1 ? 'item' : 'itens'}</span>
      </div>
      <input ref={file} type="file" hidden multiple accept="video/*,audio/*,image/*" onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; importFiles(f); }} />
    </div>
  );
}

const FX_PRESETS: { id: string; label: string; fx: Record<string, number | boolean> }[] = [
  { id: 'bw', label: 'Preto e branco', fx: { grayscale: true, contrast: 0.15 } },
  { id: 'warm', label: 'Quente', fx: { temperature: 0.5, saturation: 0.1 } },
  { id: 'cold', label: 'Frio', fx: { temperature: -0.5 } },
  { id: 'vivid', label: 'Vívido', fx: { saturation: 0.45, contrast: 0.15 } },
  { id: 'fade', label: 'Desbotado', fx: { contrast: -0.25, saturation: -0.3, brightness: 0.08 } },
  { id: 'cinema', label: 'Cinema', fx: { contrast: 0.2, saturation: -0.15, temperature: 0.2, vignette: 0.45 } },
  { id: 'sepia', label: 'Sépia', fx: { sepia: true } },
  { id: 'dream', label: 'Sonho', fx: { blur: 2, brightness: 0.12, saturation: 0.2 } },
  { id: 'night', label: 'Noite', fx: { brightness: -0.35, temperature: -0.6, saturation: -0.2 } },
];

function EffectsTab() {
  const s = useStore();
  const [q, setQ] = useState('');
  const n = q.toLowerCase();
  const applyFx = (fx: Record<string, number | boolean>) => {
    const id = s.selection.find((x) => s.seq.tracks.some((t) => t.kind === 'video' && t.clips.some((c) => c.id === x)));
    if (!id) return store.notify('Selecione um clipe de vídeo, imagem ou título');
    window.dispatchEvent(new CustomEvent('forma-video-fx', { detail: { clip: id, fx: { apply: fx } } }));
  };
  const trs = TRANSITIONS.filter((t) => t.label.toLowerCase().includes(n));
  const fxs = FX_PRESETS.filter((t) => t.label.toLowerCase().includes(n));
  return (
    <div className="fxlist">
      <div className="bin-search"><Search size={13} /><input placeholder="Buscar efeitos e transições" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
      {(!n || 'gerador título fundo'.includes(n)) && (
        <>
          <h4>Gerar</h4>
          <div className="fx-grid">
            <button className="fx-item gen" onClick={() => addTitle()}><Type size={16} />Título</button>
            <button className="fx-item gen" onClick={() => addTitle('Nome da pessoa\nCargo ou descrição')}><Type size={16} />Legenda de nome</button>
            <button className="fx-item gen" onClick={() => addColorMatte()}><Square size={16} />Fundo de cor</button>
            <button className="fx-item gen" onClick={() => addColorMatte('#000000')}><Square size={16} />Fundo preto</button>
          </div>
        </>
      )}
      {trs.length > 0 && (
        <>
          <h4>Transições de vídeo <small>arraste até o início ou o fim de um clipe</small></h4>
          <div className="fx-grid">
            {trs.map((t) => (
              <button key={t.id} className="fx-item" draggable
                onDragStart={(e) => { e.dataTransfer.setData(FX_MIME, JSON.stringify({ transition: t.id })); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => transitionAtPlayhead(t.id)}>
                <Shuffle size={14} />{t.label}
              </button>
            ))}
          </div>
        </>
      )}
      {fxs.length > 0 && (
        <>
          <h4>Predefinições de cor <small>clique com um clipe selecionado ou arraste</small></h4>
          <div className="fx-grid">
            {fxs.map((f) => (
              <button key={f.id} className="fx-item" draggable
                onDragStart={(e) => { e.dataTransfer.setData(FX_MIME, JSON.stringify({ apply: f.fx })); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => applyFx(f.fx)}>
                <Sparkles size={14} />{f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export type LeftTab = 'projeto' | 'efeitos' | 'biblioteca';

export function LeftPanel() {
  const [tab, setTab] = useState<LeftTab>('projeto');
  const [lib, setLib] = useState<LibraryTab>('imagens');
  const [color, setColor] = useState('#7c5cff');
  const ins: Inserter = useMemo(() => ({
    image: async (url, name) => {
      store.notify('Baixando imagem…');
      try {
        const r = await fetch(`/api/img?u=${encodeURIComponent(url)}`);
        if (!r.ok) throw new Error();
        await importAndPlace(await r.blob(), name);
      } catch { store.notify('A biblioteca de imagens funciona na versão publicada do site'); }
    },
    element: async (svg, name) => {
      const text = colorize(svg, color).replace('<svg ', '<svg width="1200" ');
      await importAndPlace(new Blob([text], { type: 'image/svg+xml' }), name);
    },
    color, setColor, canDrag: false,
  }), [color]);
  return (
    <aside className="vpanel left">
      <nav className="vtabs">
        <button className={tab === 'projeto' ? 'on' : ''} onClick={() => setTab('projeto')}>Projeto</button>
        <button className={tab === 'efeitos' ? 'on' : ''} onClick={() => setTab('efeitos')}>Efeitos</button>
        <button className={tab === 'biblioteca' ? 'on' : ''} onClick={() => setTab('biblioteca')}>Biblioteca</button>
      </nav>
      {tab === 'projeto' && <ProjectTab />}
      {tab === 'efeitos' && <div className="vpanel-scroll"><EffectsTab /></div>}
      {tab === 'biblioteca' && <div className="vlib"><Library ins={ins} tab={lib} onTab={setLib} onClose={() => setTab('projeto')} /></div>}
    </aside>
  );
}
