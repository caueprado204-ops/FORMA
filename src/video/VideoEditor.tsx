import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, StepBack, StepForward, Repeat, Bookmark, Camera, Download, Undo2, Redo2,
  Maximize, Clapperboard, LayoutGrid, Palette, Scan, X, Loader, ChevronDown,
} from 'lucide-react';
import { Logo } from '../Logo';
import { SEQ_PRESETS, newSequence, timecode, parseTimecode, findClip, updateClip, DEFAULT_FX } from './model';
import { savedProject, store, useStore } from './store';
import { VideoEngine, engine } from './engine';
import { restoreUrls } from './media';
import { Timeline, AudioMeters } from './Timeline';
import { Inspector } from './Inspector';
import { LeftPanel } from './Bin';
import {
  addMarker, copySelection, deleteSelection, gotoEdit, importFiles, paste, seekTo, setInOut, splitAtPlayhead,
  toggleEnable, transitionAtPlayhead, duplicateSelection,
} from './actions';

// ───────────────────────── monitor de programa ─────────────────────────
function Monitor() {
  const s = useStore();
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState({ w: 0, h: 0 });
  const [safe, setSafe] = useState(false);
  const [tcEdit, setTcEdit] = useState<string | null>(null);
  const { fps, width, height } = s.seq;

  useEffect(() => { engine.attach(ref.current!); }, []);
  useEffect(() => { engine.resize(); engine.requestDraw(); }, [width, height, s.version]);
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth - 24, H = el.clientHeight - 24;
      const k = Math.min(W / width, H / height);
      setFitSize({ w: Math.max(1, Math.floor(width * k)), h: Math.max(1, Math.floor(height * k)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const dur = s.duration;
  return (
    <section className="monitor">
      <header className="mon-head">
        <span className="mon-title">Programa: {s.seq.name}</span>
        <span className="spacer" />
        <button className={`iconbtn ${safe ? 'on' : ''}`} onClick={() => setSafe(!safe)} data-tip="Margens de segurança" aria-label="Margens de segurança"><Scan size={14} /></button>
        <button className="iconbtn" data-tip="Exportar quadro (Shift+E)" aria-label="Exportar quadro" onClick={() => exportFrame()}><Camera size={14} /></button>
        <button className="iconbtn" data-tip="Tela cheia" aria-label="Tela cheia" onClick={() => box.current?.requestFullscreen?.().catch(() => {})}><Maximize size={14} /></button>
      </header>
      <div className="mon-stage" ref={box} onDoubleClick={() => box.current?.requestFullscreen?.().catch(() => {})}>
        <div className="mon-frame" style={{ width: fitSize.w, height: fitSize.h }}>
          <canvas ref={ref} style={{ width: fitSize.w, height: fitSize.h }} onClick={() => engine.toggle()} />
          {safe && <div className="mon-safe"><i /><i /></div>}
          {!dur && (
            <div className="mon-empty">
              <Clapperboard size={30} />
              <b>Sua sequência está vazia</b>
              <span>Importe mídia no painel Projeto e arraste para a linha do tempo.</span>
            </div>
          )}
        </div>
      </div>
      <div className="mon-scrub" onPointerDown={(e) => {
        const el = e.currentTarget; el.setPointerCapture(e.pointerId);
        const go = (x: number) => { const r = el.getBoundingClientRect(); seekTo(Math.round(((x - r.left) / r.width) * Math.max(1, dur))); };
        go(e.clientX);
        const mv = (ev: PointerEvent) => go(ev.clientX);
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); engine.sync(true); };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
      }}>
        <i style={{ width: `${dur ? (s.playhead / dur) * 100 : 0}%` }} />
        {s.seq.markers.map((m) => <b key={m.id} style={{ left: `${(m.f / Math.max(1, dur)) * 100}%`, background: m.color }} />)}
      </div>
      <footer className="mon-transport">
        {tcEdit !== null ? (
          <input className="mon-tc edit" autoFocus value={tcEdit} onChange={(e) => setTcEdit(e.target.value)}
            onBlur={() => { const f = parseTimecode(tcEdit, fps); if (f !== null) seekTo(f); setTcEdit(null); }}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setTcEdit(null); }} />
        ) : (
          <button className="mon-tc" onClick={() => setTcEdit(timecode(s.playhead, fps))} data-tip="Clique para ir a um tempo">{timecode(s.playhead, fps)}</button>
        )}
        <div className="mon-btns">
          <button onClick={() => setInOut('in')} data-tip="Marcar entrada (I)" aria-label="Marcar entrada" className={s.seq.inPoint !== null ? 'lit' : ''}>{'{'}</button>
          <button onClick={() => setInOut('out')} data-tip="Marcar saída (O)" aria-label="Marcar saída" className={s.seq.outPoint !== null ? 'lit' : ''}>{'}'}</button>
          <button onClick={addMarker} data-tip="Marcador (M)" aria-label="Adicionar marcador"><Bookmark size={15} /></button>
          <span className="vsep" />
          <button onClick={() => gotoEdit(-1)} data-tip="Edição anterior (↑)" aria-label="Edição anterior"><SkipBack size={15} /></button>
          <button onClick={() => seekTo(s.playhead - 1)} data-tip="Quadro anterior (←)" aria-label="Quadro anterior"><StepBack size={15} /></button>
          <button className="mon-play" onClick={() => engine.toggle()} aria-label={s.playing ? 'Pausar' : 'Reproduzir'} data-tip="Reproduzir/pausar (Espaço)">
            {s.playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button onClick={() => seekTo(s.playhead + 1)} data-tip="Próximo quadro (→)" aria-label="Próximo quadro"><StepForward size={15} /></button>
          <button onClick={() => gotoEdit(1)} data-tip="Próxima edição (↓)" aria-label="Próxima edição"><SkipForward size={15} /></button>
          <span className="vsep" />
          <button className={s.loop ? 'lit' : ''} onClick={() => { store.loop = !store.loop; store.emit(); }} data-tip="Repetir" aria-label="Repetir"><Repeat size={15} /></button>
        </div>
        <span className="mon-tc dim">{timecode(dur, fps)}</span>
      </footer>
    </section>
  );
}

function exportFrame() {
  const url = engine.snapshot();
  const a = document.createElement('a');
  a.href = url;
  a.download = `${store.seq.name}-${timecode(store.playhead, store.seq.fps).replace(/:/g, '-')}.png`;
  a.click();
  store.notify('Quadro exportado como PNG');
}

// ───────────────────────── exportação ─────────────────────────
function ExportDialog({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const formats = VideoEngine.exportFormats();
  const [fmt, setFmt] = useState(formats[0]?.mime || '');
  const [quality, setQuality] = useState<'alta' | 'media' | 'leve'>('alta');
  const [range, setRange] = useState<'tudo' | 'inout'>(s.seq.inPoint !== null || s.seq.outPoint !== null ? 'inout' : 'tudo');
  const [busy, setBusy] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [err, setErr] = useState('');
  const ctrl = useRef<AbortController | null>(null);
  const px = s.seq.width * s.seq.height;
  const bitrate = Math.round(px * s.seq.fps * (quality === 'alta' ? 0.2 : quality === 'media' ? 0.1 : 0.05));
  const from = range === 'inout' ? s.seq.inPoint ?? 0 : 0;
  const to = range === 'inout' ? s.seq.outPoint ?? s.duration : s.duration;
  const secs = Math.max(0, (to - from) / s.seq.fps);
  const ext = formats.find((f) => f.mime === fmt)?.ext || 'webm';

  const start = async () => {
    setErr(''); setResult(null); setBusy(0);
    ctrl.current = new AbortController();
    try {
      const blob = await engine.export({ mime: fmt, bitrate, from, to, signal: ctrl.current.signal, onProgress: (p) => setBusy(p) });
      const name = `${s.seq.name}.${ext}`;
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
    } catch (e: any) {
      if (e.message !== 'cancelado') setErr(e.message || 'Não foi possível exportar');
    }
    setBusy(null);
  };

  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget && busy === null) onClose(); }}>
      <div className="modal" style={{ width: 560 }} role="dialog" aria-label="Exportar vídeo">
        <header className="modal-head"><h2>Exportar vídeo</h2><button className="modal-x" onClick={() => { ctrl.current?.abort(); onClose(); }} aria-label="Fechar">×</button></header>
        <div className="modal-body vexport">
          {!formats.length ? (
            <p className="bank-err">Este navegador não grava vídeo. Use o Chrome ou o Edge no computador.</p>
          ) : (
            <>
              <label className="lbl">Formato</label>
              <select className="vselect" value={fmt} onChange={(e) => setFmt(e.target.value)} disabled={busy !== null}>
                {formats.map((f) => <option key={f.mime} value={f.mime}>{f.label}</option>)}
              </select>
              <label className="lbl">Qualidade</label>
              <div className="seg">
                {(['alta', 'media', 'leve'] as const).map((q) => <button key={q} className={quality === q ? 'on' : ''} onClick={() => setQuality(q)} disabled={busy !== null}>{q === 'alta' ? 'Alta' : q === 'media' ? 'Média' : 'Leve'}</button>)}
              </div>
              <label className="lbl">Intervalo</label>
              <div className="seg">
                <button className={range === 'tudo' ? 'on' : ''} onClick={() => setRange('tudo')} disabled={busy !== null}>Sequência inteira</button>
                <button className={range === 'inout' ? 'on' : ''} onClick={() => setRange('inout')} disabled={busy !== null || (s.seq.inPoint === null && s.seq.outPoint === null)}>Entrada → saída</button>
              </div>
              <div className="vexport-sum">
                <span>{s.seq.width}×{s.seq.height}</span><span>{s.seq.fps} qps</span><span>{timecode(to - from, s.seq.fps)}</span><span>≈ {Math.max(1, Math.round((bitrate * secs) / 8 / 1e6))} MB</span>
              </div>
              <p className="muted small">A gravação acontece em tempo real: um vídeo de {Math.ceil(secs)}s leva cerca de {Math.ceil(secs)}s. Mantenha esta aba aberta e visível até terminar.</p>
              {busy !== null && (
                <div className="vexport-prog"><i style={{ width: `${Math.round(busy * 100)}%` }} /><span><Loader size={13} className="spin" /> Gravando… {Math.round(busy * 100)}%</span></div>
              )}
              {err && <p className="bank-err">{err}</p>}
              {result && (
                <div className="vexport-done">
                  <video src={result.url} controls />
                  <a className="btn lime" href={result.url} download={result.name}><Download size={15} />Baixar {result.name} ({(result.size / 1e6).toFixed(1)} MB)</a>
                </div>
              )}
            </>
          )}
        </div>
        <footer className="modal-foot">
          <span className="spacer" />
          {busy !== null
            ? <button className="btn ghost" onClick={() => ctrl.current?.abort()}>Cancelar</button>
            : <><button className="btn ghost" onClick={onClose}>Fechar</button><button className="btn primary" onClick={start} disabled={!formats.length || secs <= 0}><Download size={15} />{result ? 'Exportar de novo' : 'Exportar'}</button></>}
        </footer>
      </div>
    </div>
  );
}

// ───────────────────────── nova sequência ─────────────────────────
function NewSequenceDialog({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [name, setName] = useState('Sequência 01');
  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 520 }} role="dialog" aria-label="Nova sequência">
        <header className="modal-head"><h2>Nova sequência</h2><button className="modal-x" onClick={onClose} aria-label="Fechar">×</button></header>
        <div className="modal-body vexport">
          <label className="lbl">Nome</label>
          <input className="textin" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <label className="lbl">Formato</label>
          <div className="vpresets">
            {SEQ_PRESETS.map((p) => (
              <button key={p.id} className={preset === p.id ? 'on' : ''} onClick={() => setPreset(p.id)}>
                <span className="vp-shape" style={{ aspectRatio: `${p.w}/${p.h}` }} />
                <span>{p.label.split(' ')[0]}{p.id === 'vertical' ? ' (vertical)' : ''}</span>
                <small>{p.w}×{p.h}</small>
              </button>
            ))}
          </div>
          <label className="lbl">Quadros por segundo</label>
          <div className="seg">{[24, 25, 30, 60].map((f) => <button key={f} className={fps === f ? 'on' : ''} onClick={() => setFps(f)}>{f}</button>)}</div>
          <p className="muted small">A sequência atual será substituída. As mídias importadas continuam no projeto.</p>
        </div>
        <footer className="modal-foot"><span className="spacer" /><button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => { const p = SEQ_PRESETS.find((x) => x.id === preset)!; store.reset(newSequence(name || 'Sequência 01', p.w, p.h, fps)); engine.resize(); engine.gc(); engine.requestDraw(); onClose(); }}>Criar sequência</button>
        </footer>
      </div>
    </div>
  );
}

// ───────────────────────── editor ─────────────────────────
const SHORTCUTS: [string, string][] = [
  ['Espaço', 'Reproduzir / pausar'], ['J · K · L', 'Voltar 1s · Pausar · Reproduzir'], ['← →', 'Quadro anterior / próximo (Shift: 10)'],
  ['↑ ↓', 'Edição anterior / próxima'], ['Home · End', 'Início / fim'], ['I · O', 'Marcar entrada / saída'], ['M', 'Marcador'],
  ['V · C · H', 'Seleção · Lâmina · Mão'], ['Ctrl+K', 'Cortar no indicador'], ['Del · Shift+Del', 'Limpar · Exclusão com ondulação'],
  ['Ctrl+D', 'Transição padrão'], ['Ctrl+C · Ctrl+V', 'Copiar · Colar no indicador'], ['Shift+E', 'Ativar/desativar clipe'],
  ['Alt+arrastar', 'Mover só o vídeo ou só o áudio'], ['Ctrl+arrastar borda', 'Aparar com ondulação'], ['+ · − · \\', 'Zoom da linha do tempo'],
  ['S', 'Encaixar'], ['Ctrl+Z · Ctrl+Shift+Z', 'Desfazer · Refazer'], ['Ctrl+M', 'Exportar'], ['Ctrl+I', 'Importar'],
];

export default function VideoEditor() {
  const s = useStore();
  const [dialog, setDialog] = useState<'export' | 'new' | 'keys' | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // reabre o último projeto
  useEffect(() => {
    const p = savedProject();
    if (p && store.history.length === 1 && !store.media.size) {
      restoreUrls(p.media).then((urls) => { store.load(p, urls); engine.resize(); engine.requestDraw(); });
    }
    return () => { engine.pause(); };
  }, []);

  // efeitos soltos/aplicados a partir do painel Efeitos
  useEffect(() => {
    const on = (e: Event) => {
      const { clip, fx } = (e as CustomEvent).detail;
      if (!fx?.apply) return;
      store.apply(updateClip(store.seq, clip, (c) => { c.fx = { ...DEFAULT_FX, ...c.fx, ...fx.apply }; }), 'Aplicar efeito');
      store.select([clip]);
      window.dispatchEvent(new CustomEvent('forma-video-tab', { detail: 'cor' }));
      engine.requestDraw();
    };
    window.addEventListener('forma-video-fx', on);
    return () => window.removeEventListener('forma-video-fx', on);
  }, []);

  useEffect(() => {
    if (!s.toast) return;
    setToast(true);
    const t = setTimeout(() => setToast(false), 2600);
    return () => clearTimeout(t);
  }, [s.toast?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = `${s.seq.name} — Forma Vídeo`; }, [s.seq.name]);

  // atalhos de teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (dialog) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const fps = store.seq.fps;
      const stop = () => e.preventDefault();
      if (e.code === 'Space') { stop(); engine.toggle(); return; }
      if (mod && k === 'z') { stop(); e.shiftKey ? store.redo() : store.undo(); engine.gc(); engine.requestDraw(); return; }
      if (mod && k === 'y') { stop(); store.redo(); engine.requestDraw(); return; }
      if (mod && k === 'k') { stop(); splitAtPlayhead(); return; }
      if (mod && k === 'd') { stop(); transitionAtPlayhead(); return; }
      if (mod && k === 'c') { stop(); copySelection(); return; }
      if (mod && k === 'v') { stop(); paste(); return; }
      if (mod && k === 'a') { stop(); store.select(store.seq.tracks.flatMap((x) => x.clips.map((c) => c.id))); return; }
      if (mod && k === 'm') { stop(); setDialog('export'); return; }
      if (mod && k === 'i') { stop(); fileRef.current?.click(); return; }
      if (mod && k === 'j') { stop(); duplicateSelection(); return; }
      if (mod) return;
      if (e.shiftKey && k === 'e') { stop(); toggleEnable(); return; }
      switch (k) {
        case 'k': engine.pause(); break;
        case 'l': if (!store.playing) engine.play(); break;
        case 'j': seekTo(store.playhead - fps); break;
        case 'arrowleft': stop(); if (store.playing) engine.pause(); seekTo(store.playhead - (e.shiftKey ? 10 : 1)); break;
        case 'arrowright': stop(); if (store.playing) engine.pause(); seekTo(store.playhead + (e.shiftKey ? 10 : 1)); break;
        case 'arrowup': stop(); gotoEdit(-1); break;
        case 'arrowdown': stop(); gotoEdit(1); break;
        case 'home': stop(); seekTo(0); break;
        case 'end': stop(); seekTo(store.duration); break;
        case 'i': setInOut('in'); break;
        case 'o': setInOut('out'); break;
        case 'm': addMarker(); break;
        case 'v': store.tool = 'select'; store.emit(); break;
        case 'c': store.tool = 'razor'; store.emit(); break;
        case 'h': store.tool = 'hand'; store.emit(); break;
        case 's': store.snap = !store.snap; store.notify(store.snap ? 'Encaixar ligado' : 'Encaixar desligado'); break;
        case 'delete': case 'backspace': stop(); deleteSelection(e.shiftKey); break;
        case '=': case '+': store.setZoom(store.zoom * 1.4); break;
        case '-': store.setZoom(store.zoom / 1.4); break;
        case '\\': store.setZoom(Math.max(0.05, (window.innerWidth - 600) / Math.max(fps * 5, store.duration))); break;
        case 'escape': store.select([]); break;
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [dialog]);

  const sel = s.selection[0] ? findClip(s.seq, s.selection[0]) : null;

  return (
    <div className="veditor">
      <header className="vtop">
        <a className="brand" href="#" aria-label="Página inicial"><Logo size={26} /></a>
        <div className="vmenu">
          <button className="vmenu-btn" onClick={() => setMenu(!menu)}>Forma Vídeo <ChevronDown size={13} /></button>
          {menu && (
            <div className="menu-pop" onPointerLeave={() => setMenu(false)}>
              <button className="menu-item" onClick={() => { setMenu(false); setDialog('new'); }}><span>Nova sequência…</span><kbd /></button>
              <button className="menu-item" onClick={() => { setMenu(false); fileRef.current?.click(); }}><span>Importar mídia…</span><kbd>Ctrl+I</kbd></button>
              <button className="menu-item" onClick={() => { setMenu(false); setDialog('export'); }}><span>Exportar vídeo…</span><kbd>Ctrl+M</kbd></button>
              <button className="menu-item" onClick={() => { setMenu(false); exportFrame(); }}><span>Exportar quadro (PNG)</span><kbd /></button>
              <div className="menu-sep" />
              <button className="menu-item" onClick={() => { setMenu(false); setDialog('keys'); }}><span>Atalhos de teclado</span><kbd /></button>
            </div>
          )}
        </div>
        <nav className="vworkspaces">
          <a href="#/editor"><Palette size={14} />Imagem</a>
          <a className="on" href="#/video"><Clapperboard size={14} />Vídeo</a>
          <a href="#/apps"><LayoutGrid size={14} />Apps</a>
        </nav>
        <span className="vtop-doc"><span className="dot" />{s.seq.name}<span className="muted"> · {s.seq.width}×{s.seq.height} · {s.seq.fps} qps</span></span>
        <span className="spacer" />
        <button className="iconbtn" onClick={() => { store.undo(); engine.requestDraw(); }} disabled={s.hIndex <= 0} data-tip={`Desfazer ${s.history[s.hIndex]?.label || ''}`} aria-label="Desfazer"><Undo2 size={16} /></button>
        <button className="iconbtn" onClick={() => { store.redo(); engine.requestDraw(); }} disabled={s.hIndex >= s.history.length - 1} data-tip="Refazer" aria-label="Refazer"><Redo2 size={16} /></button>
        <button className="btn lime sm" onClick={() => setDialog('export')} disabled={!s.duration}><Download size={14} />Exportar</button>
      </header>

      <div className="vgrid">
        <LeftPanel />
        <Monitor />
        <Inspector />
        <div className="vbottom">
          <Timeline />
          <AudioMeters />
        </div>
      </div>

      <footer className="vstatus">
        <span>{s.media.size} mídia{s.media.size === 1 ? '' : 's'}</span>
        <span>{s.seq.tracks.reduce((n, t) => n + t.clips.length, 0)} clipes</span>
        {sel && <span>Selecionado: {sel.clip.name}</span>}
        <span className="spacer" />
        <span>Salvo automaticamente neste navegador</span>
      </footer>

      <div className={`toast vtoast ${toast ? 'show' : ''}`}>{s.toast?.msg}</div>
      <input ref={fileRef} type="file" hidden multiple accept="video/*,audio/*,image/*" onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; importFiles(f); }} />
      {dialog === 'export' && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === 'new' && <NewSequenceDialog onClose={() => setDialog(null)} />}
      {dialog === 'keys' && (
        <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <div className="modal" style={{ width: 640 }} role="dialog" aria-label="Atalhos">
            <header className="modal-head"><h2>Atalhos do Forma Vídeo</h2><button className="modal-x" onClick={() => setDialog(null)} aria-label="Fechar"><X size={16} /></button></header>
            <div className="modal-body"><div className="vkeys">{SHORTCUTS.map(([k, d]) => <div key={k} className="sc"><span>{d}</span><kbd>{k}</kbd></div>)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
