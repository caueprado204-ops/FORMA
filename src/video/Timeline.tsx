import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, EyeOff, Lock, LockOpen, Magnet, MousePointer2, Plus, Scissors, Volume2, VolumeX, Headphones, ZoomIn, ZoomOut, Hand,
} from 'lucide-react';
import {
  type Clip, type Media, type Track, end, findClip, keyTimes, linkedIds, moveClips, razor, snapPoints, timecode, trimClip, addTrack, updateTrack,
} from './model';
import { store, useStore } from './store';
import { engine } from './engine';
import { closeGapAt, placeMedia, seekTo, deleteSelection, duplicateSelection, unlinkSelection, toggleEnable, transitionAtPlayhead, splitAtPlayhead } from './actions';

export const MEDIA_MIME = 'application/x-forma-media';
export const FX_MIME = 'application/x-forma-fx';
const HEAD = 176; // largura do cabeçalho das trilhas
const SNAP_PX = 8;

const COLORS: Record<Clip['kind'], string> = {
  video: '#6f5cf0', audio: '#2f9e72', image: '#d9822b', title: '#d6457f', color: '#8a7a3a',
};

function rulerStep(zoom: number, fps: number) {
  // escolhe o intervalo entre marcas para ficarem a ~90px
  const candidates = [1, 2, 5, 10, 15, fps, fps * 2, fps * 5, fps * 10, fps * 15, fps * 30, fps * 60, fps * 120, fps * 300, fps * 600];
  return candidates.find((c) => c * zoom >= 90) || candidates[candidates.length - 1];
}

// ───────────────────────── régua ─────────────────────────
function Ruler({ width, scrollX }: { width: number; scrollX: number }) {
  const s = useStore();
  const { fps } = s.seq;
  const step = rulerStep(s.zoom, fps);
  const first = Math.floor(scrollX / s.zoom / step) * step;
  const ticks: number[] = [];
  for (let f = first; f * s.zoom - scrollX < width + step * s.zoom; f += step) ticks.push(f);
  const drag = useRef(false);
  const toFrame = (clientX: number, el: HTMLElement) => Math.max(0, Math.round((clientX - el.getBoundingClientRect().left + scrollX) / s.zoom));
  return (
    <div className="tl-ruler"
      onPointerDown={(e) => { drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); if (store.playing) engine.pause(); seekTo(toFrame(e.clientX, e.currentTarget)); }}
      onPointerMove={(e) => { if (drag.current) seekTo(toFrame(e.clientX, e.currentTarget)); }}
      onPointerUp={() => { drag.current = false; engine.sync(true); }}>
      {s.seq.inPoint !== null || s.seq.outPoint !== null ? (
        <div className="tl-inout" style={{ left: (s.seq.inPoint ?? 0) * s.zoom - scrollX, width: ((s.seq.outPoint ?? s.duration) - (s.seq.inPoint ?? 0)) * s.zoom }} />
      ) : null}
      {ticks.map((f) => (
        <span key={f} className="tl-tick" style={{ left: f * s.zoom - scrollX }}>
          <i>{step < fps ? (f % fps === 0 ? timecode(f, fps).slice(3, 8) : `:${String(f % fps).padStart(2, '0')}`) : timecode(f, fps).slice(f >= fps * 3600 ? 0 : 3, 8)}</i>
        </span>
      ))}
      {ticks.flatMap((f) => [1, 2, 3, 4].map((k) => (
        <span key={`${f}-${k}`} className="tl-subtick" style={{ left: (f + (step * k) / 5) * s.zoom - scrollX }} />
      )))}
      {s.seq.markers.map((m) => (
        <span key={m.id} className="tl-marker" title={m.name} style={{ left: m.f * s.zoom - scrollX, ['--m' as any]: m.color }}
          onPointerDown={(e) => { e.stopPropagation(); seekTo(m.f); }} />
      ))}
    </div>
  );
}

// ───────────────────────── conteúdo do clipe ─────────────────────────
function Waveform({ media, clip, width, height }: { media: Media; clip: Clip; width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fps = store.seq.fps;
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv || !media.peaks) return;
    const W = Math.min(4000, Math.max(1, Math.round(width))), H = Math.max(1, height);
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d')!;
    x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(214,255,236,.75)';
    const peaks = media.peaks;
    const secs = (clip.duration / fps) * clip.speed;
    for (let i = 0; i < W; i++) {
      const t = clip.sourceIn + (i / W) * secs;
      const j = Math.floor(t * 100);
      const p = peaks[Math.min(peaks.length - 1, Math.max(0, j))] || 0;
      const h = Math.max(1, Math.sqrt(p) * H * 0.92);
      x.fillRect(i, (H - h) / 2, 1, h);
    }
  }, [media.peaks, clip.sourceIn, clip.duration, clip.speed, width, height, fps]);
  return <canvas ref={ref} className="clip-wave" style={{ width: Math.min(4000, width), height }} />;
}

function Thumbs({ media, clip, width }: { media: Media; clip: Clip; width: number }) {
  const thumbs = media.thumbs || [];
  if (!thumbs.length) return null;
  const tw = 72 * ((media.width || 16) / (media.height || 9)) * 0.62;
  const n = Math.max(1, Math.min(60, Math.ceil(width / tw)));
  const fps = store.seq.fps;
  return (
    <div className="clip-thumbs">
      {Array.from({ length: n }, (_, i) => {
        if (media.kind === 'image') return <img key={i} src={thumbs[0]} alt="" draggable={false} style={{ width: tw }} />;
        const t = clip.sourceIn + ((i * tw) / Math.max(1, width)) * (clip.duration / fps) * clip.speed;
        const idx = Math.min(thumbs.length - 1, Math.max(0, Math.floor((t / Math.max(0.01, media.duration)) * thumbs.length)));
        return <img key={i} src={thumbs[idx]} alt="" draggable={false} style={{ width: tw }} />;
      })}
    </div>
  );
}

// ───────────────────────── linha do tempo ─────────────────────────
type Drag =
  | { kind: 'move'; ids: string[]; x0: number; y0: number; origStart: number; dF: number; dT: number; tk: Track['kind'] }
  | { kind: 'trim'; id: string; edge: 'in' | 'out'; x0: number; dF: number; ripple: boolean }
  | { kind: 'marquee'; x0: number; y0: number; x1: number; y1: number };

export function Timeline() {
  const s = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [viewW, setViewW] = useState(800);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [snapAt, setSnapAt] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; clip?: string; track?: string; f: number } | null>(null);
  const [dropGhost, setDropGhost] = useState<{ track: string; f: number; len: number } | null>(null);
  const { fps } = s.seq;
  const total = Math.max(s.duration + fps * 30, Math.ceil(viewW / s.zoom));
  const contentW = total * s.zoom;

  useEffect(() => {
    const el = scroller.current!;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth - HEAD));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // indicador sempre visível durante a reprodução
  useEffect(() => {
    if (!s.playing) return;
    const el = scroller.current!;
    const x = s.playhead * s.zoom;
    if (x > el.scrollLeft + viewW - 40) el.scrollLeft = x - 40;
    else if (x < el.scrollLeft) el.scrollLeft = Math.max(0, x - 40);
  }, [s.playhead, s.playing, s.zoom, viewW]);

  useEffect(() => {
    if (!menu) return;
    const off = () => setMenu(null);
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [menu]);

  const frameAt = (clientX: number) => {
    const el = scroller.current!;
    return Math.max(0, Math.round((clientX - el.getBoundingClientRect().left - HEAD + el.scrollLeft) / s.zoom));
  };

  const snap = (f: number, exclude: Set<string>) => {
    if (!s.snap) return { f, hit: null as number | null };
    const pts = snapPoints(s.seq, exclude, s.playhead);
    let best: number | null = null;
    for (const p of pts) if (Math.abs(p - f) * s.zoom <= SNAP_PX && (best === null || Math.abs(p - f) < Math.abs(best - f))) best = p;
    return best === null ? { f, hit: null } : { f: best, hit: best };
  };

  const onClipDown = (e: React.PointerEvent, t: Track, c: Clip) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (store.playing) engine.pause();
    if (s.tool === 'razor') {
      const f = snap(frameAt(e.clientX), new Set()).f;
      const ids = e.altKey ? [c.id] : linkedIds(s.seq, [c.id]);
      store.apply(razor(s.seq, f, ids), 'Lâmina');
      return;
    }
    if (t.locked) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const edgeW = Math.min(10, rect.width / 3);
    const sel = e.shiftKey || e.metaKey || e.ctrlKey
      ? (s.selection.includes(c.id) ? s.selection.filter((x) => x !== c.id) : [...s.selection, c.id])
      : s.selection.includes(c.id) ? s.selection : (e.altKey ? [c.id] : linkedIds(s.seq, [c.id]));
    store.select(sel);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.clientX - rect.left < edgeW) setDrag({ kind: 'trim', id: c.id, edge: 'in', x0: e.clientX, dF: 0, ripple: e.ctrlKey || e.metaKey });
    else if (rect.right - e.clientX < edgeW) setDrag({ kind: 'trim', id: c.id, edge: 'out', x0: e.clientX, dF: 0, ripple: e.ctrlKey || e.metaKey });
    else setDrag({ kind: 'move', ids: e.altKey ? [c.id] : linkedIds(s.seq, sel), x0: e.clientX, y0: e.clientY, origStart: c.start, dF: 0, dT: 0, tk: t.kind });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    if (drag.kind === 'move') {
      const raw = Math.round((e.clientX - drag.x0) / s.zoom);
      const ex = new Set(drag.ids);
      // encaixa o início ou o fim do clipe arrastado
      const c = findClip(s.seq, drag.ids[0])!.clip;
      const a = snap(drag.origStart + raw, ex), b = snap(drag.origStart + raw + c.duration, ex);
      let dF = raw, hit: number | null = null;
      if (a.hit !== null) { dF = a.f - drag.origStart; hit = a.hit; } else if (b.hit !== null) { dF = b.f - c.duration - drag.origStart; hit = b.hit; }
      setSnapAt(hit);
      const dT = Math.round((e.clientY - drag.y0) / 54);
      setDrag({ ...drag, dF, dT });
    } else if (drag.kind === 'trim') {
      const c = findClip(s.seq, drag.id)!.clip;
      const raw = Math.round((e.clientX - drag.x0) / s.zoom);
      const edgeF = (drag.edge === 'in' ? c.start : end(c)) + raw;
      const sn = snap(edgeF, new Set(linkedIds(s.seq, [drag.id])));
      setSnapAt(sn.hit);
      setDrag({ ...drag, dF: sn.f - (drag.edge === 'in' ? c.start : end(c)) });
    } else if (drag.kind === 'marquee') {
      setDrag({ ...drag, x1: e.clientX, y1: e.clientY });
    }
  };

  const onUp = () => {
    if (!drag) return;
    if (drag.kind === 'move' && (drag.dF || drag.dT)) store.apply(moveClips(s.seq, drag.ids, drag.dF, drag.dT, drag.tk), 'Mover');
    if (drag.kind === 'trim' && drag.dF) store.apply(trimClip(s.seq, drag.id, drag.edge, drag.dF, s.media, drag.ripple), drag.ripple ? 'Aparar com ondulação' : 'Aparar');
    if (drag.kind === 'marquee') {
      const el = scroller.current!.getBoundingClientRect();
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1), y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      const ids: string[] = [];
      scroller.current!.querySelectorAll<HTMLElement>('.clip').forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.right > x0 && r.left < x1 && r.bottom > y0 && r.top < y1 && r.left < el.right) ids.push(n.dataset.id!);
      });
      store.select(ids);
    }
    setDrag(null);
    setSnapAt(null);
    engine.requestDraw();
  };

  /** Posição de exibição do clipe durante o arraste. */
  const view = (t: Track, c: Clip) => {
    let start = c.start, dur = c.duration, ghostTrack = t.id;
    if (drag?.kind === 'move' && drag.ids.includes(c.id)) {
      start = Math.max(0, c.start + drag.dF);
      if (drag.dT) {
        const same = s.seq.tracks.filter((x) => x.kind === t.kind);
        let i = same.indexOf(t);
        if (t.kind === drag.tk) i = Math.max(0, Math.min(same.length - 1, i + drag.dT));
        ghostTrack = same[i].id;
      }
    }
    if (drag?.kind === 'trim' && linkedIds(s.seq, [drag.id]).includes(c.id)) {
      if (drag.edge === 'in') { const d = Math.min(drag.dF, c.duration - 1); start = c.start + d; dur = c.duration - d; }
      else dur = Math.max(1, c.duration + drag.dF);
    }
    return { start, dur, ghostTrack };
  };

  const trackHeight = (t: Track) => (t.kind === 'video' ? 58 : 52);
  const vTracks = s.seq.tracks.filter((t) => t.kind === 'video');
  const aTracks = s.seq.tracks.filter((t) => t.kind === 'audio');

  const lane = (t: Track) => {
    const h = trackHeight(t);
    const clips = s.seq.tracks.flatMap((tt) => tt.clips.map((c) => ({ tt, c }))).filter(({ tt, c }) => view(tt, c).ghostTrack === t.id);
    return (
      <div key={t.id} className={`tl-lane ${t.kind} ${t.locked ? 'locked' : ''}`} style={{ height: h }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(MEDIA_MIME) || t.locked) return;
          e.preventDefault();
          const f = snap(frameAt(e.clientX), new Set()).f;
          setDropGhost({ track: t.id, f, len: 5 * fps });
        }}
        onDragLeave={() => setDropGhost(null)}
        onDrop={(e) => {
          setDropGhost(null);
          const id = e.dataTransfer.getData(MEDIA_MIME);
          const fxData = e.dataTransfer.getData(FX_MIME);
          if (fxData) return;
          const m = id ? s.media.get(id) : null;
          if (!m) return;
          e.preventDefault();
          const f = snap(frameAt(e.clientX), new Set()).f;
          placeMedia(m, f, m.kind === 'audio' ? (t.kind === 'audio' ? t.id : undefined) : t.kind === 'video' ? t.id : undefined);
        }}
        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, track: t.id, f: frameAt(e.clientX) }); }}>
        {dropGhost?.track === t.id && <div className="tl-dropghost" style={{ left: dropGhost.f * s.zoom, width: dropGhost.len * s.zoom }} />}
        {clips.map(({ tt, c }) => {
          const v = view(tt, c);
          const left = v.start * s.zoom, w = Math.max(2, v.dur * s.zoom);
          const m = c.media ? s.media.get(c.media) : undefined;
          const sel = s.selection.includes(c.id);
          const keys = keyTimes(c);
          return (
            <div key={c.id} data-id={c.id}
              className={`clip ${c.kind} ${sel ? 'sel' : ''} ${!c.enabled ? 'off' : ''} ${s.tool === 'razor' ? 'razor' : ''} ${drag?.kind === 'move' && drag.ids.includes(c.id) ? 'dragging' : ''}`}
              style={{ left, width: w, ['--cc' as any]: COLORS[c.kind] }}
              onPointerDown={(e) => onClipDown(e, tt, c)} onPointerMove={(e) => { e.stopPropagation(); onMove(e); }} onPointerUp={(e) => { e.stopPropagation(); onUp(); }}
              onDoubleClick={() => { seekTo(Math.max(c.start, Math.min(end(c) - 1, s.playhead))); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (!sel) store.select(linkedIds(s.seq, [c.id])); setMenu({ x: e.clientX, y: e.clientY, clip: c.id, f: frameAt(e.clientX) }); }}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(FX_MIME)) { e.preventDefault(); e.stopPropagation(); } }}
              onDrop={(e) => {
                const raw = e.dataTransfer.getData(FX_MIME);
                if (!raw) return;
                e.preventDefault(); e.stopPropagation();
                const fx = JSON.parse(raw);
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                if (fx.transition) transitionAtPlayhead(fx.transition, c.id, e.clientX - r.left < r.width / 2 ? 'in' : 'out');
                else fx.apply && window.dispatchEvent(new CustomEvent('forma-video-fx', { detail: { clip: c.id, fx } }));
              }}>
              <div className="clip-body">
                {c.kind === 'video' || c.kind === 'image' ? (m && <Thumbs media={m} clip={c} width={w} />) : null}
                {c.kind === 'audio' && m && <Waveform media={m} clip={c} width={w} height={h - 18} />}
                {c.kind === 'title' && <div className="clip-title-prev" style={{ fontFamily: c.title?.font }}>{c.title?.text}</div>}
                {c.kind === 'color' && <div className="clip-color-prev" style={{ background: c.color }} />}
              </div>
              <div className="clip-label">
                {c.link && <span className="clip-link" title="Vinculado">∞</span>}
                <span className="ellip">{c.name}</span>
                {c.speed !== 1 && <span className="clip-badge">{Math.round(c.speed * 100)}%</span>}
                {Object.values(c.fx).some((v) => v && v !== 0) && <span className="clip-badge fx">fx</span>}
              </div>
              {keys.length > 0 && (
                <div className="clip-keys">{keys.map((k) => <i key={k} style={{ left: k * s.zoom }} />)}</div>
              )}
              <span className="clip-edge in" /><span className="clip-edge out" />
            </div>
          );
        })}
        {t.transitions.map((tr) => (
          <div key={tr.id} className={`tl-tr ${s.selTransition === tr.id ? 'sel' : ''} ${!tr.from ? 'from-none' : ''} ${!tr.to ? 'to-none' : ''}`}
            style={{ left: tr.start * s.zoom, width: Math.max(6, tr.duration * s.zoom) }}
            title="Transição"
            onPointerDown={(e) => { e.stopPropagation(); store.selectTransition(tr.id); }} />
        ))}
      </div>
    );
  };

  const header = (t: Track) => {
    const h = trackHeight(t);
    const upd = (p: Partial<Track>, label: string) => { store.apply(updateTrack(s.seq, t.id, p), label); engine.requestDraw(); };
    return (
      <div key={t.id} className={`tl-head ${t.kind}`} style={{ height: h }}>
        <button className={`tl-hbtn ${t.locked ? 'on' : ''}`} onClick={() => upd({ locked: !t.locked }, 'Bloquear trilha')} aria-label="Bloquear trilha" data-tip="Bloquear">
          {t.locked ? <Lock size={12} /> : <LockOpen size={12} />}
        </button>
        <span className="tl-name">{t.name}</span>
        {t.kind === 'video' ? (
          <button className={`tl-hbtn ${t.hidden ? 'off' : ''}`} onClick={() => upd({ hidden: !t.hidden }, 'Visibilidade da trilha')} aria-label="Mostrar trilha" data-tip="Mostrar/ocultar">
            {t.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        ) : (
          <>
            <button className={`tl-hbtn m ${t.muted ? 'on red' : ''}`} onClick={() => upd({ muted: !t.muted }, 'Silenciar trilha')} aria-label="Silenciar" data-tip="Silenciar (M)">M</button>
            <button className={`tl-hbtn m ${t.solo ? 'on lime' : ''}`} onClick={() => upd({ solo: !t.solo }, 'Solo')} aria-label="Solo" data-tip="Solo">S</button>
          </>
        )}
      </div>
    );
  };

  const playX = s.playhead * s.zoom;
  const marquee = drag?.kind === 'marquee' ? drag : null;

  return (
    <section className="tl">
      <div className="tl-bar">
        <span className="tl-seqname">{s.seq.name}</span>
        <span className="tl-tc">{timecode(s.playhead, fps)}</span>
        <div className="seg tl-tools">
          <button className={s.tool === 'select' ? 'on' : ''} onClick={() => { store.tool = 'select'; store.emit(); }} data-tip="Seleção (V)" aria-label="Seleção"><MousePointer2 size={14} /></button>
          <button className={s.tool === 'razor' ? 'on' : ''} onClick={() => { store.tool = 'razor'; store.emit(); }} data-tip="Lâmina (C)" aria-label="Lâmina"><Scissors size={14} /></button>
          <button className={s.tool === 'hand' ? 'on' : ''} onClick={() => { store.tool = 'hand'; store.emit(); }} data-tip="Mão (H)" aria-label="Mão"><Hand size={14} /></button>
        </div>
        <button className={`tl-toggle ${s.snap ? 'on' : ''}`} onClick={() => { store.snap = !store.snap; store.emit(); }} data-tip="Encaixar (S)" aria-label="Encaixar"><Magnet size={14} /></button>
        <span className="spacer" />
        <button className="iconbtn" onClick={() => store.setZoom(s.zoom / 1.4)} aria-label="Afastar" data-tip="Afastar (−)"><ZoomOut size={14} /></button>
        <input className="tl-zoom" type="range" min={-3} max={4.1} step={0.01} value={Math.log(s.zoom)} onChange={(e) => store.setZoom(Math.exp(parseFloat(e.target.value)))} aria-label="Zoom da linha do tempo" />
        <button className="iconbtn" onClick={() => store.setZoom(s.zoom * 1.4)} aria-label="Aproximar" data-tip="Aproximar (+)"><ZoomIn size={14} /></button>
        <button className="btn ghost sm" onClick={() => store.setZoom(Math.max(0.05, (viewW - 40) / Math.max(fps * 5, s.duration)))}>Ajustar</button>
      </div>
      <div className="tl-scroll" ref={scroller} onScroll={(e) => setScrollX((e.target as HTMLElement).scrollLeft)}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            const el = scroller.current!;
            const f = frameAt(e.clientX);
            const nz = Math.min(60, Math.max(0.05, s.zoom * Math.pow(0.998, e.deltaY)));
            store.setZoom(nz);
            requestAnimationFrame(() => { el.scrollLeft = f * nz - (e.clientX - el.getBoundingClientRect().left - HEAD); });
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest('.clip,.tl-head,.tl-tr,.tl-ruler,.tl-corner')) return;
          if (s.tool === 'hand') {
            const el = scroller.current!; const x0 = e.clientX, sl = el.scrollLeft;
            const mv = (ev: PointerEvent) => { el.scrollLeft = sl - (ev.clientX - x0); };
            const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
            window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
            return;
          }
          store.select([]);
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDrag({ kind: 'marquee', x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY });
        }}
        onPointerMove={onMove} onPointerUp={onUp}>
        <div className="tl-inner" style={{ width: contentW + HEAD }}>
          <div className="tl-top">
            <div className="tl-corner">
              <button className="iconbtn" onClick={() => store.apply(addTrack(s.seq, 'video'), 'Adicionar trilha')} data-tip="Nova trilha de vídeo" aria-label="Nova trilha de vídeo"><Plus size={13} />V</button>
              <button className="iconbtn" onClick={() => store.apply(addTrack(s.seq, 'audio'), 'Adicionar trilha')} data-tip="Nova trilha de áudio" aria-label="Nova trilha de áudio"><Plus size={13} />A</button>
            </div>
            <div className="tl-ruler-wrap"><Ruler width={viewW} scrollX={scrollX} /></div>
          </div>
          <div className="tl-tracks">
            <div className="tl-heads">
              {vTracks.map(header)}
              <div className="tl-divider" />
              {aTracks.map(header)}
            </div>
            <div className="tl-lanes" style={{ width: contentW }}>
              {vTracks.map(lane)}
              <div className="tl-divider" />
              {aTracks.map(lane)}
              {s.seq.markers.map((m) => <span key={m.id} className="tl-markerline" style={{ left: m.f * s.zoom, ['--m' as any]: m.color }} />)}
              {snapAt !== null && <span className="tl-snapline" style={{ left: snapAt * s.zoom }} />}
            </div>
          </div>
          <div className="tl-playhead" style={{ left: HEAD + playX }}><span /></div>
        </div>
        {marquee && (
          <div className="tl-marquee" style={{
            left: Math.min(marquee.x0, marquee.x1) - scroller.current!.getBoundingClientRect().left + scroller.current!.scrollLeft,
            top: Math.min(marquee.y0, marquee.y1) - scroller.current!.getBoundingClientRect().top + scroller.current!.scrollTop,
            width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0),
          }} />
        )}
      </div>
      {menu && (
        <div className="ctxmenu" style={{ left: menu.x, top: menu.y }} onPointerDown={(e) => e.stopPropagation()}>
          {menu.clip ? (
            <>
              <button onClick={() => { setMenu(null); store.seek(menu.f); splitAtPlayhead(); }}>Cortar aqui <kbd>C</kbd></button>
              <button onClick={() => { setMenu(null); duplicateSelection(); }}>Duplicar</button>
              <button onClick={() => { setMenu(null); unlinkSelection(); }}>Desvincular áudio e vídeo</button>
              <button onClick={() => { setMenu(null); toggleEnable(); }}>Ativar/desativar <kbd>Shift+E</kbd></button>
              <button onClick={() => { setMenu(null); transitionAtPlayhead('dissolve', menu.clip, 'in'); }}>Transição no início</button>
              <button onClick={() => { setMenu(null); transitionAtPlayhead('dissolve', menu.clip, 'out'); }}>Transição no fim</button>
              <div className="ctxsep" />
              <button onClick={() => { setMenu(null); deleteSelection(false); }}>Limpar <kbd>Del</kbd></button>
              <button onClick={() => { setMenu(null); deleteSelection(true); }}>Exclusão com ondulação <kbd>Shift+Del</kbd></button>
            </>
          ) : (
            <>
              <button onClick={() => { setMenu(null); closeGapAt(menu.track!, menu.f); }}>Fechar espaço vazio</button>
              <button onClick={() => { setMenu(null); seekTo(menu.f); }}>Mover indicador para cá</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function AudioMeters() {
  const ref = useRef<HTMLCanvasElement>(null);
  const peak = useRef([0, 0]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const cv = ref.current;
      if (cv) {
        const [l, r] = engine.levels();
        const x = cv.getContext('2d')!;
        const W = cv.width, H = cv.height;
        x.clearRect(0, 0, W, H);
        [l, r].forEach((v, i) => {
          const db = v > 0 ? 20 * Math.log10(v) : -60;
          const n = Math.max(0, Math.min(1, (db + 60) / 60));
          peak.current[i] = Math.max(n, peak.current[i] - 0.008);
          const bw = (W - 6) / 2, bx = 2 + i * (bw + 2);
          x.fillStyle = 'rgba(255,255,255,.05)';
          x.fillRect(bx, 0, bw, H);
          const g = x.createLinearGradient(0, H, 0, 0);
          g.addColorStop(0, '#3ddc97'); g.addColorStop(0.7, '#d4ff3a'); g.addColorStop(0.9, '#ff9f43'); g.addColorStop(1, '#ff5c5c');
          x.fillStyle = g;
          x.fillRect(bx, H - n * H, bw, n * H);
          x.fillStyle = '#fff';
          x.fillRect(bx, H - peak.current[i] * H, bw, 1.5);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <aside className="meters" aria-label="Medidores de áudio">
      <canvas ref={ref} width={26} height={300} />
      <div className="meters-scale">{[0, -6, -12, -18, -24, -30, -36, -42, -48, -54].map((d) => <span key={d}>{d}</span>)}</div>
    </aside>
  );
}

export const _unused = { useMemo };
