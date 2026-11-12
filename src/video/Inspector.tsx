import { useEffect, useRef, useState } from 'react';
import { Diamond, ChevronLeft, ChevronRight, Timer, RotateCcw, Trash2 } from 'lucide-react';
import {
  type Clip, type Param, type Transform, DEFAULT_FX, TRANSITIONS, SEQ_PRESETS, end, findClip, hasKeyAt, removeKey, setParam, setSpeed,
  timecode, toggleAnimate, updateClip, updateTransition, removeTransition, valueAt,
} from './model';
import { store, useStore } from './store';
import { engine } from './engine';
import { FontPicker } from '../editor/FontPicker';

const BLENDS: { id: GlobalCompositeOperation; label: string }[] = [
  { id: 'source-over', label: 'Normal' }, { id: 'multiply', label: 'Multiplicar' }, { id: 'screen', label: 'Tela' },
  { id: 'overlay', label: 'Sobrepor' }, { id: 'soft-light', label: 'Luz suave' }, { id: 'hard-light', label: 'Luz direta' },
  { id: 'darken', label: 'Escurecer' }, { id: 'lighten', label: 'Clarear' }, { id: 'difference', label: 'Diferença' },
  { id: 'color-dodge', label: 'Subexposição de cor' }, { id: 'luminosity', label: 'Luminosidade' },
];

/** Campo numérico que muda arrastando o rótulo (como os "valores quentes" de editores de vídeo). */
function Scrub({ label, value, min = -Infinity, max = Infinity, step = 1, unit = '', digits = 0, onLive, onCommit }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string; digits?: number;
  onLive: (v: number) => void; onCommit: () => void;
}) {
  const [edit, setEdit] = useState<string | null>(null);
  const drag = useRef<{ x: number; v: number; moved: boolean } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <span className="scrub">
      <span className="scrub-label"
        onPointerDown={(e) => { drag.current = { x: e.clientX, v: value, moved: false }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 1) drag.current.moved = true;
          onLive(clamp(+(drag.current.v + dx * step * (e.shiftKey ? 10 : 1)).toFixed(4)));
        }}
        onPointerUp={() => { if (drag.current?.moved) onCommit(); drag.current = null; }}>{label}</span>
      {edit !== null ? (
        <input autoFocus onFocus={(e) => e.target.select()} className="scrub-in" value={edit} onChange={(e) => setEdit(e.target.value)}
          onBlur={() => { const v = parseFloat(edit.replace(',', '.')); if (!isNaN(v)) { onLive(clamp(v)); onCommit(); } setEdit(null); }}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEdit(null); }} />
      ) : (
        <button className="scrub-val" onClick={() => setEdit(String(+value.toFixed(digits)))}>{value.toFixed(digits)}{unit}</button>
      )}
    </span>
  );
}

function Section({ title, children, right, open: initial = true }: { title: string; children: React.ReactNode; right?: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <section className={`ins-sec ${open ? 'open' : ''}`}>
      <header onClick={() => setOpen(!open)}><span className="caret">▸</span>{title}<span className="ins-right" onClick={(e) => e.stopPropagation()}>{right}</span></header>
      {open && <div className="ins-body">{children}</div>}
    </section>
  );
}

function liveClip(id: string, fn: (c: Clip) => void) {
  store.live(updateClip(store.seq, id, fn).seq);
  engine.requestDraw();
}
const commit = (label: string) => store.commit(label);

/** Linha de parâmetro animável: cronômetro, valor e navegação entre keyframes. */
function ParamRow({ clip, label, get, set, min, max, step, unit, digits, commitLabel }: {
  clip: Clip; label: string; get: (c: Clip) => Param; set: (c: Clip, p: Param) => void;
  min?: number; max?: number; step?: number; unit?: string; digits?: number; commitLabel: string;
}) {
  const s = useStore();
  const rel = Math.max(0, Math.min(clip.duration - 1, s.playhead - clip.start));
  const p = get(clip);
  const animated = !!p.k?.length;
  const keys = p.k || [];
  const prev = [...keys].reverse().find((k) => k.f < rel);
  const next = keys.find((k) => k.f > rel);
  const go = (f?: number) => { if (f !== undefined) { store.seek(clip.start + f); engine.sync(true); engine.requestDraw(); } };
  return (
    <div className="prow">
      <button className={`stopwatch ${animated ? 'on' : ''}`} data-tip={animated ? 'Desligar animação' : 'Animar (criar keyframe)'} aria-label="Animar"
        onClick={() => { store.apply(updateClip(s.seq, clip.id, (c) => set(c, toggleAnimate(get(c), rel))), 'Animação'); engine.requestDraw(); }}>
        <Timer size={13} />
      </button>
      <Scrub label={label} value={valueAt(p, rel)} min={min} max={max} step={step} unit={unit} digits={digits}
        onLive={(v) => liveClip(clip.id, (c) => set(c, setParam(get(c), rel, v)))} onCommit={() => commit(commitLabel)} />
      {animated && (
        <span className="kfnav">
          <button onClick={() => go(prev?.f)} disabled={!prev} aria-label="Keyframe anterior"><ChevronLeft size={12} /></button>
          <button className={hasKeyAt(p, rel) ? 'on' : ''} aria-label="Adicionar/remover keyframe"
            onClick={() => { store.apply(updateClip(s.seq, clip.id, (c) => set(c, hasKeyAt(get(c), rel) ? removeKey(get(c), rel) : setParam(get(c), rel, valueAt(get(c), rel)))), 'Keyframe'); engine.requestDraw(); }}>
            <Diamond size={11} />
          </button>
          <button onClick={() => go(next?.f)} disabled={!next} aria-label="Próximo keyframe"><ChevronRight size={12} /></button>
        </span>
      )}
    </div>
  );
}

function tfRow(key: keyof Transform) {
  return { get: (c: Clip) => c.transform[key], set: (c: Clip, p: Param) => { c.transform[key] = p; } };
}

function Slider({ label, value, min, max, step = 0.01, fmt, onLive, onCommit }: {
  label: string; value: number; min: number; max: number; step?: number; fmt?: (v: number) => string; onLive: (v: number) => void; onCommit: () => void;
}) {
  const pct = ((value - min) / (max - min)) * 100, zero = ((Math.max(min, Math.min(max, 0)) - min) / (max - min)) * 100;
  return (
    <label className="vslider">
      <span className="vslider-row"><span>{label}</span><span className="mono" onDoubleClick={() => { onLive(Math.max(min, Math.min(max, 0))); onCommit(); }}>{fmt ? fmt(value) : value.toFixed(2)}</span></span>
      <span className="vslider-track">
        <i style={{ left: `${Math.min(pct, zero)}%`, width: `${Math.abs(pct - zero)}%` }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onLive(parseFloat(e.target.value))} onPointerUp={onCommit} onKeyUp={onCommit} />
      </span>
    </label>
  );
}

// ───────────────────────── painéis ─────────────────────────
function ClipInspector({ clip, tab }: { clip: Clip; tab: Tab }) {
  const s = useStore();
  const m = clip.media ? s.media.get(clip.media) : undefined;
  const fps = s.seq.fps;
  const visual = clip.kind !== 'audio';
  const audible = clip.kind === 'audio' || (clip.kind === 'video' && !clip.link && m?.hasAudio);
  const fx = clip.fx;
  const setFx = (patch: Partial<typeof fx>) => liveClip(clip.id, (c) => { c.fx = { ...c.fx, ...patch }; });

  return (
    <div className="ins">
      <div className="ins-clip">
        <span className={`ins-dot ${clip.kind}`} />
        <div><b className="ellip">{clip.name}</b><small>{timecode(clip.start, fps)} → {timecode(end(clip), fps)} · {(clip.duration / fps).toFixed(2)}s</small></div>
      </div>

      {tab === 'controles' && (
        <>
          {visual && (
            <Section title="Movimento" right={<button className="link" onClick={() => { store.apply(updateClip(s.seq, clip.id, (c) => { c.transform = { ...c.transform, x: { v: 0 }, y: { v: 0 }, scale: { v: 100 }, rotation: { v: 0 } }; }), 'Redefinir movimento'); engine.requestDraw(); }}><RotateCcw size={11} /> Redefinir</button>}>
              <ParamRow clip={clip} label="Posição X" {...tfRow('x')} step={1} digits={0} commitLabel="Posição" />
              <ParamRow clip={clip} label="Posição Y" {...tfRow('y')} step={1} digits={0} commitLabel="Posição" />
              <ParamRow clip={clip} label="Escala" {...tfRow('scale')} min={0} max={1000} step={0.5} unit="%" digits={1} commitLabel="Escala" />
              <ParamRow clip={clip} label="Rotação" {...tfRow('rotation')} step={0.5} unit="°" digits={1} commitLabel="Rotação" />
            </Section>
          )}
          {visual && (
            <Section title="Opacidade">
              <ParamRow clip={clip} label="Opacidade" {...tfRow('opacity')} min={0} max={100} step={0.5} unit="%" digits={1} commitLabel="Opacidade" />
              <div className="ins-field"><span>Mesclagem</span>
                <select value={clip.blend} onChange={(e) => { store.apply(updateClip(s.seq, clip.id, (c) => { c.blend = e.target.value as GlobalCompositeOperation; }), 'Modo de mesclagem'); engine.requestDraw(); }}>
                  {BLENDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
            </Section>
          )}
          {clip.kind !== 'title' && clip.kind !== 'color' && clip.kind !== 'image' && (
            <Section title="Velocidade">
              <div className="chips">
                {[0.25, 0.5, 0.75, 1, 1.5, 2, 4].map((v) => (
                  <button key={v} className={`chip ${clip.speed === v ? 'on' : ''}`} onClick={() => { store.apply(setSpeed(s.seq, clip.id, v, s.media), 'Velocidade'); engine.requestDraw(); }}>{v * 100}%</button>
                ))}
              </div>
              <small className="muted">A duração do clipe muda junto, como em Velocidade/Duração.</small>
            </Section>
          )}
          {(audible || clip.kind === 'audio') && (
            <Section title="Áudio">
              <ParamRow clip={clip} label="Volume" get={(c) => c.volume} set={(c, p) => { c.volume = p; }} min={-60} max={15} step={0.1} unit=" dB" digits={1} commitLabel="Volume" />
              <div className="ins-row2">
                <Scrub label="Fade in" value={(clip.fadeIn || 0) / fps} min={0} max={clip.duration / fps / 2} step={0.02} unit="s" digits={2}
                  onLive={(v) => liveClip(clip.id, (c) => { c.fadeIn = Math.round(v * fps); })} onCommit={() => commit('Fade de áudio')} />
                <Scrub label="Fade out" value={(clip.fadeOut || 0) / fps} min={0} max={clip.duration / fps / 2} step={0.02} unit="s" digits={2}
                  onLive={(v) => liveClip(clip.id, (c) => { c.fadeOut = Math.round(v * fps); })} onCommit={() => commit('Fade de áudio')} />
              </div>
              <label className="check"><input type="checkbox" checked={!!clip.muted} onChange={(e) => store.apply(updateClip(s.seq, clip.id, (c) => { c.muted = e.target.checked; }), 'Silenciar clipe')} />Silenciar este clipe</label>
            </Section>
          )}
          {clip.kind === 'title' && clip.title && <TitleEditor clip={clip} />}
          {clip.kind === 'color' && (
            <Section title="Fundo de cor">
              <div className="ins-field"><span>Cor</span><input type="color" value={clip.color} onChange={(e) => liveClip(clip.id, (c) => { c.color = e.target.value; })} onBlur={() => commit('Cor do fundo')} /></div>
            </Section>
          )}
        </>
      )}

      {tab === 'cor' && visual && (
        <>
          <Section title="Correção básica" right={<button className="link" onClick={() => { store.apply(updateClip(s.seq, clip.id, (c) => { c.fx = { ...DEFAULT_FX }; }), 'Redefinir cor'); engine.requestDraw(); }}><RotateCcw size={11} /> Redefinir</button>}>
            <Slider label="Exposição" value={fx.brightness} min={-1} max={1} fmt={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}`} onLive={(v) => setFx({ brightness: v })} onCommit={() => commit('Exposição')} />
            <Slider label="Contraste" value={fx.contrast} min={-1} max={1} fmt={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}`} onLive={(v) => setFx({ contrast: v })} onCommit={() => commit('Contraste')} />
            <Slider label="Saturação" value={fx.saturation} min={-1} max={1} fmt={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}`} onLive={(v) => setFx({ saturation: v })} onCommit={() => commit('Saturação')} />
            <Slider label="Temperatura" value={fx.temperature} min={-1} max={1} fmt={(v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)}`} onLive={(v) => setFx({ temperature: v })} onCommit={() => commit('Temperatura')} />
            <Slider label="Matiz" value={fx.hue} min={-180} max={180} step={1} fmt={(v) => `${v.toFixed(0)}°`} onLive={(v) => setFx({ hue: v })} onCommit={() => commit('Matiz')} />
          </Section>
          <Section title="Efeitos criativos">
            <Slider label="Desfoque" value={fx.blur} min={0} max={40} step={0.5} fmt={(v) => `${v.toFixed(1)}px`} onLive={(v) => setFx({ blur: v })} onCommit={() => commit('Desfoque')} />
            <Slider label="Vinheta" value={fx.vignette} min={0} max={1} fmt={(v) => (v * 100).toFixed(0)} onLive={(v) => setFx({ vignette: v })} onCommit={() => commit('Vinheta')} />
            <div className="chips">
              {(['grayscale', 'sepia', 'invert'] as const).map((k) => (
                <button key={k} className={`chip ${fx[k] ? 'on' : ''}`} onClick={() => { store.apply(updateClip(s.seq, clip.id, (c) => { c.fx = { ...c.fx, [k]: !c.fx[k] }; }), 'Efeito'); engine.requestDraw(); }}>
                  {k === 'grayscale' ? 'P&B' : k === 'sepia' ? 'Sépia' : 'Inverter'}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}
      {tab === 'cor' && !visual && <p className="ins-empty">Clipes de áudio não têm cor. Selecione um clipe de vídeo, imagem ou título.</p>}
    </div>
  );
}

function TitleEditor({ clip }: { clip: Clip }) {
  const s = useStore();
  const t = clip.title!;
  const setT = (patch: Partial<typeof t>, label?: string) => {
    const fn = (c: Clip) => { c.title = { ...c.title!, ...patch }; if (patch.text !== undefined) c.name = patch.text.split('\n')[0].slice(0, 30) || 'Título'; };
    if (label) { store.apply(updateClip(s.seq, clip.id, fn), label); engine.requestDraw(); } else liveClip(clip.id, fn);
  };
  return (
    <Section title="Texto">
      <textarea className="ins-text" value={t.text} rows={3} onChange={(e) => setT({ text: e.target.value })} onBlur={() => commit('Texto do título')} onKeyDown={(e) => e.stopPropagation()} />
      <FontPicker value={t.font} width="100%" onChange={(f) => setT({ font: f }, 'Fonte do título')} onPreview={(f) => { if (f) setT({ font: f }); }} />
      <div className="ins-row2">
        <Scrub label="Tamanho" value={t.size} min={8} max={600} step={1} digits={0} unit="px" onLive={(v) => setT({ size: v })} onCommit={() => commit('Tamanho do texto')} />
        <Scrub label="Peso" value={t.weight} min={100} max={900} step={2} digits={0} onLive={(v) => setT({ weight: Math.round(v / 100) * 100 })} onCommit={() => commit('Peso do texto')} />
      </div>
      <div className="ins-field"><span>Cor</span><input type="color" value={t.color} onChange={(e) => setT({ color: e.target.value })} onBlur={() => commit('Cor do texto')} /></div>
      <div className="ins-field"><span>Caixa de fundo</span>
        <span className="row gap4">
          <input type="checkbox" checked={!!t.bg} onChange={(e) => setT({ bg: e.target.checked ? '#7c5cff' : null }, 'Caixa do título')} />
          {t.bg && <input type="color" value={t.bg} onChange={(e) => setT({ bg: e.target.value })} onBlur={() => commit('Caixa do título')} />}
        </span>
      </div>
      <div className="ins-field"><span>Contorno</span>
        <span className="row gap4">
          <Scrub label="" value={t.stroke} min={0} max={40} step={0.5} digits={0} unit="px" onLive={(v) => setT({ stroke: v })} onCommit={() => commit('Contorno')} />
          <input type="color" value={t.strokeColor} onChange={(e) => setT({ strokeColor: e.target.value })} onBlur={() => commit('Contorno')} />
        </span>
      </div>
      <div className="seg">
        {(['left', 'center', 'right'] as const).map((a) => <button key={a} className={t.align === a ? 'on' : ''} onClick={() => setT({ align: a }, 'Alinhamento')}>{a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}</button>)}
      </div>
      <label className="check"><input type="checkbox" checked={t.shadow} onChange={(e) => setT({ shadow: e.target.checked }, 'Sombra do texto')} />Sombra</label>
    </Section>
  );
}

function TransitionInspector({ id }: { id: string }) {
  const s = useStore();
  const found = s.seq.tracks.flatMap((t) => t.transitions).find((x) => x.id === id);
  if (!found) return null;
  const fps = s.seq.fps;
  const upd = (p: Parameters<typeof updateTransition>[2], label: string) => { store.apply(updateTransition(s.seq, id, p), label); engine.requestDraw(); };
  return (
    <div className="ins">
      <div className="ins-clip"><span className="ins-dot tr" /><div><b>{TRANSITIONS.find((t) => t.id === found.type)?.label}</b><small>{timecode(found.start, fps)} · {(found.duration / fps).toFixed(2)}s</small></div></div>
      <Section title="Transição">
        <div className="ins-field"><span>Tipo</span>
          <select value={found.type} onChange={(e) => upd({ type: e.target.value as any }, 'Tipo de transição')}>
            {TRANSITIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <Scrub label="Duração" value={found.duration / fps} min={1 / fps} max={10} step={0.02} digits={2} unit="s"
          onLive={(v) => store.live(updateTransition(s.seq, id, { duration: Math.max(1, Math.round(v * fps)) }).seq)} onCommit={() => commit('Duração da transição')} />
        {found.from && found.to && (
          <div className="ins-field"><span>Alinhamento</span>
            <select value={found.align} onChange={(e) => upd({ align: e.target.value as any }, 'Alinhamento da transição')}>
              <option value="center">Centralizar no corte</option><option value="start">Começar no corte</option><option value="end">Terminar no corte</option>
            </select>
          </div>
        )}
        <button className="btn ghost sm" onClick={() => store.apply(removeTransition(s.seq, id), 'Remover transição')}><Trash2 size={13} />Remover transição</button>
      </Section>
    </div>
  );
}

function SequenceInspector() {
  const s = useStore();
  const q = s.seq;
  const set = (patch: Partial<typeof q>, label: string) => { store.apply({ seq: { ...q, ...patch } }, label); engine.resize(); engine.requestDraw(); };
  return (
    <div className="ins">
      <div className="ins-clip"><span className="ins-dot seq" /><div><b>{q.name}</b><small>{q.width}×{q.height} · {q.fps} qps · {timecode(s.duration, q.fps)}</small></div></div>
      <Section title="Sequência">
        <div className="ins-field"><span>Nome</span><input className="ins-input" defaultValue={q.name} onBlur={(e) => e.target.value.trim() && set({ name: e.target.value.trim() }, 'Renomear sequência')} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></div>
        <div className="ins-field"><span>Formato</span>
          <select value={SEQ_PRESETS.find((p) => p.w === q.width && p.h === q.height)?.id || ''} onChange={(e) => { const p = SEQ_PRESETS.find((x) => x.id === e.target.value); if (p) set({ width: p.w, height: p.h }, 'Formato da sequência'); }}>
            {!SEQ_PRESETS.some((p) => p.w === q.width && p.h === q.height) && <option value="">{q.width}×{q.height} (personalizado)</option>}
            {SEQ_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="ins-field"><span>Quadros por segundo</span>
          <select value={q.fps} onChange={(e) => {
            const fps = parseInt(e.target.value), k = fps / q.fps;
            const nq = structuredClone(q);
            nq.fps = fps;
            for (const t of nq.tracks) {
              for (const c of t.clips) { c.start = Math.round(c.start * k); c.duration = Math.max(1, Math.round(c.duration * k)); }
              for (const tr of t.transitions) { tr.start = Math.round(tr.start * k); tr.duration = Math.max(1, Math.round(tr.duration * k)); }
            }
            nq.markers.forEach((m) => { m.f = Math.round(m.f * k); });
            store.playhead = Math.round(store.playhead * k);
            store.apply({ seq: nq }, 'Taxa de quadros');
          }}>
            {[24, 25, 30, 50, 60].map((f) => <option key={f} value={f}>{f} qps</option>)}
          </select>
        </div>
        <div className="ins-field"><span>Cor de fundo</span><input type="color" value={q.bg} onChange={(e) => set({ bg: e.target.value }, 'Fundo da sequência')} /></div>
      </Section>
      <p className="ins-empty">Selecione um clipe na linha do tempo para editar movimento, opacidade, velocidade, áudio e cor.</p>
    </div>
  );
}

export type Tab = 'controles' | 'cor';

export function Inspector() {
  const s = useStore();
  const [tab, setTab] = useState<Tab>('controles');
  const clipId = s.selection.find((id) => { const f = findClip(s.seq, id); return f && f.clip.kind !== 'audio'; }) || s.selection[0];
  const f = clipId ? findClip(s.seq, clipId) : null;
  useEffect(() => {
    const on = (e: Event) => setTab((e as CustomEvent).detail);
    window.addEventListener('forma-video-tab', on);
    return () => window.removeEventListener('forma-video-tab', on);
  }, []);
  return (
    <aside className="vpanel inspector">
      <nav className="vtabs">
        <button className={tab === 'controles' ? 'on' : ''} onClick={() => setTab('controles')}>Controles de efeito</button>
        <button className={tab === 'cor' ? 'on' : ''} onClick={() => setTab('cor')}>Cor</button>
      </nav>
      <div className="vpanel-scroll">
        {s.selTransition ? <TransitionInspector id={s.selTransition} /> : f ? <ClipInspector clip={f.clip} tab={tab} /> : <SequenceInspector />}
      </div>
    </aside>
  );
}
