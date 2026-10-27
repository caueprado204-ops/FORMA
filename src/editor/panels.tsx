import { useEffect, useMemo, useRef, useState } from 'react';
import { ActiveSelection, FabricImage, Group, IText, Line, Rect, Shadow, type FabricObject } from 'fabric';
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal,
  AlignStartVertical, Bold, ClockFading, Eye, EyeOff, Folder, Image as ImageIcon, Italic, Layers, Lock, LockOpen,
  Palette, Plus, Copy, SlidersHorizontal, Trash, Type, Underline, Brush, Shapes, TextAlignStart, TextAlignCenter,
  TextAlignEnd, Settings2, Sparkles, ArrowLeftRight,
} from 'lucide-react';
import { BLEND_MODES, DEFAULT_ADJUST, type Adjust, type FormaEngine, type LayerKind } from './engine';
import { LUTS } from '../data/luts';
import { applyLut, lutBytes } from './lut';
import { FontPicker } from './FontPicker';
import { ColorPicker, IconBtn, NumField, SWATCHES, Section, Select, Slider, normHex } from './ui';

// ───────────────────────── campo de cor com popover ─────────────────────────
export function ColorField({ value, onChange, onCommit, allowNone }: { value: string | null; onChange: (v: string) => void; onCommit?: () => void; allowNone?: boolean; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState(value || '');
  useEffect(() => setHex(value || ''), [value]);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); onCommit?.(); }
    };
    window.addEventListener('pointerdown', off, true);
    return () => window.removeEventListener('pointerdown', off, true);
  }, [open, onCommit]);
  return (
    <div className="colorfield" ref={ref}>
      <button className={`swatch ${!value ? 'none' : ''}`} style={{ background: value || undefined }} onClick={() => setOpen(!open)} aria-label="Escolher cor" />
      <input
        className="hexin" value={hex} placeholder={allowNone ? 'nenhuma' : ''}
        onChange={(e) => setHex(e.target.value)}
        onBlur={() => { const n = normHex(hex); if (n) { onChange(n); onCommit?.(); } else setHex(value || ''); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
      {open && (
        <div className="popover">
          <ColorPicker value={value || '#7c5cff'} onChange={onChange} />
          <div className="swatches">
            {SWATCHES.map((s) => <button key={s} style={{ background: s }} onClick={() => { onChange(s); onCommit?.(); }} aria-label={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Cor ─────────────────────────
export function ColorPanel({ e }: { e: FormaEngine }) {
  const [which, setWhich] = useState<'fg' | 'bg'>('fg');
  const val = which === 'fg' ? e.fg : e.bg;
  const set = (v: string) => (which === 'fg' ? e.setColors(v) : e.setColors(undefined, v));
  const [hex, setHex] = useState(val);
  useEffect(() => setHex(val), [val]);
  return (
    <div className="colorpanel">
      <div className="colorpanel-top">
        <div className="fgbg">
          <button className={`fgbg-bg ${which === 'bg' ? 'sel' : ''}`} style={{ background: e.bg }} onClick={() => setWhich('bg')} aria-label="Cor de fundo" />
          <button className={`fgbg-fg ${which === 'fg' ? 'sel' : ''}`} style={{ background: e.fg }} onClick={() => setWhich('fg')} aria-label="Cor de frente" />
        </div>
        <div className="colorpanel-meta">
          <span className="muted">{which === 'fg' ? 'Cor de frente' : 'Cor de fundo'}</span>
          <input className="hexin wide" value={hex} onChange={(ev) => setHex(ev.target.value)}
            onBlur={() => { const n = normHex(hex); n ? set(n) : setHex(val); }}
            onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }} />
        </div>
        <IconBtn tip="Trocar cores (X)" onClick={() => e.swapColors()}><ArrowLeftRight size={14} /></IconBtn>
      </div>
      <ColorPicker value={val} onChange={set} />
      <div className="swatches">
        {SWATCHES.map((s) => <button key={s} style={{ background: s }} onClick={() => set(s)} aria-label={s} />)}
      </div>
    </div>
  );
}

// ───────────────────────── Propriedades ─────────────────────────
const WEIGHTS = [{ id: '300', label: 'Light' }, { id: '400', label: 'Regular' }, { id: '500', label: 'Medium' }, { id: '600', label: 'Semibold' }, { id: '700', label: 'Bold' }, { id: '800', label: 'Extrabold' }];

export function PropertiesPanel({ e }: { e: FormaEngine }) {
  const fontBefore = useRef<string | null>(null); // fonte original enquanto o usuário só passa o mouse na lista
  const o = e.canvas.getActiveObject() as (FabricObject & { kind?: LayerKind; name?: string }) | undefined;
  if (!o || (o as any).isHelper) return <DocProps e={e} />;
  const br = o.getBoundingRect();
  const w = o.getScaledWidth(), h = o.getScaledHeight();
  const isText = o instanceof IText;
  const isShape = (o instanceof Rect || o.type === 'ellipse' || o instanceof Line) && !(o instanceof ActiveSelection);
  const fill = typeof o.fill === 'string' && o.fill !== 'transparent' ? o.fill : null;
  const stroke = typeof o.stroke === 'string' ? o.stroke : null;
  const commit = (label: string) => e.commit(label);
  const multi = o instanceof ActiveSelection;

  return (
    <div className="props">
      <Section title="Transformar" right={<span className="muted small">{multi ? `${(o as ActiveSelection).size()} camadas` : o.name}</span>}>
        <div className="grid2">
          <NumField label="X" value={br.left} onCommit={(v) => e.update(o, { left: o.left + (v - br.left) }, 'Mover')} />
          <NumField label="Y" value={br.top} onCommit={(v) => e.update(o, { top: o.top + (v - br.top) }, 'Mover')} />
          <NumField label="L" value={w} min={1} onCommit={(v) => e.update(o, { scaleX: (v / o.width) * (o.flipX ? 1 : 1) }, 'Redimensionar')} />
          <NumField label="A" value={h} min={1} onCommit={(v) => e.update(o, { scaleY: v / o.height }, 'Redimensionar')} />
          <NumField label="∠" value={o.angle || 0} suffix="°" onCommit={(v) => { o.rotate(v); e.update(o, {}, 'Girar'); }} />
          <div className="row gap4">
            <IconBtn tip="Espelhar horizontal" onClick={() => e.flipLayer('x')}><span className="flipglyph">⇋</span></IconBtn>
            <IconBtn tip="Espelhar vertical" onClick={() => e.flipLayer('y')}><span className="flipglyph rot">⇋</span></IconBtn>
          </div>
        </div>
        <div className="row aligns">
          <IconBtn tip="Alinhar à esquerda" onClick={() => e.align('left')}><AlignStartVertical size={14} /></IconBtn>
          <IconBtn tip="Centralizar na horizontal" onClick={() => e.align('hcenter')}><AlignCenterVertical size={14} /></IconBtn>
          <IconBtn tip="Alinhar à direita" onClick={() => e.align('right')}><AlignEndVertical size={14} /></IconBtn>
          <IconBtn tip="Alinhar ao topo" onClick={() => e.align('top')}><AlignStartHorizontal size={14} /></IconBtn>
          <IconBtn tip="Centralizar na vertical" onClick={() => e.align('vcenter')}><AlignCenterHorizontal size={14} /></IconBtn>
          <IconBtn tip="Alinhar à base" onClick={() => e.align('bottom')}><AlignEndHorizontal size={14} /></IconBtn>
        </div>
      </Section>

      {isText && (
        <Section title="Texto">
          <FontPicker value={(o as IText).fontFamily} width="100%"
            onChange={(v) => { fontBefore.current = null; e.update(o, { fontFamily: v }, 'Fonte'); }}
            onPreview={(v) => {
              if (v) { if (fontBefore.current === null) fontBefore.current = (o as IText).fontFamily; e.update(o, { fontFamily: v }); }
              else if (fontBefore.current !== null) { e.update(o, { fontFamily: fontBefore.current }); fontBefore.current = null; }
            }} />
          <div className="grid2" style={{ marginTop: 8 }}>
            <Select value={String((o as IText).fontWeight)} options={WEIGHTS} onChange={(v) => e.update(o, { fontWeight: v }, 'Peso da fonte')} />
            <NumField label="T" value={(o as IText).fontSize} min={1} suffix="px" onCommit={(v) => e.update(o, { fontSize: v }, 'Tamanho da fonte')} />
            <NumField label="↕" value={(o as IText).lineHeight} step={0.05} min={0.5} onCommit={(v) => e.update(o, { lineHeight: v }, 'Entrelinha')} />
            <NumField label="↔" value={(o as IText).charSpacing} step={10} onCommit={(v) => e.update(o, { charSpacing: v }, 'Espaçamento')} />
          </div>
          <div className="row gap4" style={{ marginTop: 8 }}>
            <IconBtn tip="Negrito" active={Number((o as IText).fontWeight) >= 700 || (o as IText).fontWeight === 'bold'} onClick={() => e.update(o, { fontWeight: Number((o as IText).fontWeight) >= 700 ? '400' : '700' }, 'Negrito')}><Bold size={14} /></IconBtn>
            <IconBtn tip="Itálico" active={(o as IText).fontStyle === 'italic'} onClick={() => e.update(o, { fontStyle: (o as IText).fontStyle === 'italic' ? 'normal' : 'italic' }, 'Itálico')}><Italic size={14} /></IconBtn>
            <IconBtn tip="Sublinhado" active={!!(o as IText).underline} onClick={() => e.update(o, { underline: !(o as IText).underline }, 'Sublinhado')}><Underline size={14} /></IconBtn>
            <span className="vsep" />
            <IconBtn tip="Alinhar à esquerda" active={(o as IText).textAlign === 'left'} onClick={() => e.update(o, { textAlign: 'left' }, 'Alinhamento')}><TextAlignStart size={14} /></IconBtn>
            <IconBtn tip="Centralizar" active={(o as IText).textAlign === 'center'} onClick={() => e.update(o, { textAlign: 'center' }, 'Alinhamento')}><TextAlignCenter size={14} /></IconBtn>
            <IconBtn tip="Alinhar à direita" active={(o as IText).textAlign === 'right'} onClick={() => e.update(o, { textAlign: 'right' }, 'Alinhamento')}><TextAlignEnd size={14} /></IconBtn>
          </div>
        </Section>
      )}

      {(isText || isShape) && (
        <Section title="Aparência">
          {!(o instanceof Line) && (
            <div className="field"><span>Preenchimento</span>
              <ColorField value={fill} allowNone onChange={(v) => e.update(o, { fill: v })} onCommit={() => commit('Preenchimento')} />
            </div>
          )}
          <div className="field"><span>Contorno</span>
            <ColorField value={stroke} allowNone onChange={(v) => e.update(o, { stroke: v, strokeWidth: o.strokeWidth || 2 })} onCommit={() => commit('Contorno')} />
          </div>
          <div className="grid2">
            <NumField label="Esp." value={o.strokeWidth || 0} min={0} suffix="px" onCommit={(v) => e.update(o, { strokeWidth: v, stroke: v && !o.stroke ? e.fg : o.stroke }, 'Espessura')} />
            {o instanceof Rect && <NumField label="Raio" value={(o as Rect).rx || 0} min={0} onCommit={(v) => e.update(o, { rx: v, ry: v }, 'Cantos')} />}
          </div>
        </Section>
      )}

      {!multi && !isShape && !isText && e.tintParts(o).length > 0 && (
        <Section title="Cor do elemento">
          <div className="field"><span>Cor</span>
            <ColorField value={e.elementColor(o)} onChange={(v) => e.setElementColor(o, v)} onCommit={() => e.commit('Cor do elemento')} />
          </div>
          {e.elementStroke(o) !== null && (
            <Slider label="Espessura do traço" value={e.elementStroke(o)!} min={0.25} max={Math.max(10, Math.ceil(e.elementStroke(o)! * 3))} step={0.25}
              format={(v) => v.toFixed(2).replace(/\.?0+$/, '')}
              onChange={(v) => e.setElementStroke(o, v)} onCommit={() => e.commit('Espessura do traço')} />
          )}
        </Section>
      )}

      {!multi && (
        <Section title="Efeitos" defaultOpen={!!o.shadow}>
          <label className="check">
            <input type="checkbox" checked={!!o.shadow} onChange={(ev) => e.update(o, { shadow: ev.target.checked ? new Shadow({ color: 'rgba(0,0,0,0.45)', blur: 24, offsetX: 0, offsetY: 12 }) : null }, 'Sombra')} />
            Sombra projetada
          </label>
          {o.shadow && (
            <>
              <Slider label="Desfoque" value={o.shadow.blur} min={0} max={120} step={1} format={(v) => `${v}px`}
                onChange={(v) => { o.shadow!.blur = v; o.set('dirty', true); e.canvas.requestRenderAll(); e.emit(); }} onCommit={() => commit('Sombra')} />
              <Slider label="Distância" value={o.shadow.offsetY} min={-100} max={100} step={1} center format={(v) => `${v}px`}
                onChange={(v) => { o.shadow!.offsetY = v; o.set('dirty', true); e.canvas.requestRenderAll(); e.emit(); }} onCommit={() => commit('Sombra')} />
            </>
          )}
        </Section>
      )}
    </div>
  );
}

function DocProps({ e }: { e: FormaEngine }) {
  return (
    <div className="props">
      <Section title="Documento">
        <div className="grid2">
          <NumField label="L" value={e.doc.width} min={1} suffix="px" onCommit={(v) => e.setDocSize(v, e.doc.height, true, false, 'center')} />
          <NumField label="A" value={e.doc.height} min={1} suffix="px" onCommit={(v) => e.setDocSize(e.doc.width, v, true, false, 'center')} />
        </div>
        <div className="field" style={{ marginTop: 8 }}><span>Fundo</span>
          <ColorField value={e.doc.background} allowNone onChange={(v) => e.setBackground(v, false)} onCommit={() => e.commit('Cor de fundo')} />
        </div>
        <label className="check">
          <input type="checkbox" checked={!e.doc.background} onChange={(ev) => e.setBackground(ev.target.checked ? null : '#ffffff')} />
          Fundo transparente
        </label>
      </Section>
      <div className="hintcard">
        <Sparkles size={14} />
        <span>Selecione uma camada para editar posição, texto, cores e efeitos. <kbd>Ctrl</kbd> <kbd>K</kbd> abre todos os comandos.</span>
      </div>
    </div>
  );
}

// ───────────────────────── Ajustes ─────────────────────────
const ADJ: { k: keyof Adjust; label: string; min: number; max: number; step?: number; center?: boolean; fmt?: (v: number) => string }[] = [
  { k: 'exposure', label: 'Exposição', min: -1, max: 1, center: true },
  { k: 'brightness', label: 'Brilho', min: -0.5, max: 0.5, center: true },
  { k: 'contrast', label: 'Contraste', min: -0.6, max: 0.6, center: true },
  { k: 'saturation', label: 'Saturação', min: -1, max: 1, center: true },
  { k: 'vibrance', label: 'Vibração', min: -1, max: 1, center: true },
  { k: 'temperature', label: 'Temperatura', min: -1, max: 1, center: true },
  { k: 'hue', label: 'Matiz', min: -1, max: 1, center: true, fmt: (v) => `${Math.round(v * 180)}°` },
];
const FX: typeof ADJ = [
  { k: 'sharpen', label: 'Nitidez', min: 0, max: 1.2 },
  { k: 'blur', label: 'Desfoque', min: 0, max: 0.6 },
  { k: 'noise', label: 'Granulado', min: 0, max: 300, step: 1, fmt: (v) => String(v) },
  { k: 'vignette', label: 'Vinheta', min: 0, max: 1 },
  { k: 'pixelate', label: 'Pixelizar', min: 0, max: 60, step: 1, fmt: (v) => String(v) },
];

function useThrottled<T extends any[]>(fn: (...a: T) => void, ms = 70) {
  const t = useRef(0);
  const pending = useRef<T | null>(null);
  return (...a: T) => {
    pending.current = a;
    if (t.current) return;
    t.current = window.setTimeout(() => {
      t.current = 0;
      if (pending.current) fn(...pending.current);
    }, ms);
  };
}

export function AdjustPanel({ e }: { e: FormaEngine }) {
  const o = e.active() as (FabricImage & { adjust?: Adjust; id?: string }) | null;
  const isImg = o instanceof FabricImage;
  const [local, setLocal] = useState<Adjust>(DEFAULT_ADJUST);
  const cur = isImg ? { ...DEFAULT_ADJUST, ...(o!.adjust || {}) } : DEFAULT_ADJUST;
  const id = isImg ? o!.id : null;
  useEffect(() => setLocal(cur), [id, e.historyIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = useThrottled((p: Partial<Adjust>) => { if (isImg) e.setAdjust(o!, p); });

  if (!isImg) {
    const a = e.active();
    return (
      <div className="empty">
        <SlidersHorizontal size={22} />
        <p>Ajustes e looks funcionam em camadas de imagem.</p>
        {a && !(a instanceof ActiveSelection) && <button className="btn sm" onClick={() => e.rasterize(a)}>Rasterizar “{a.name}”</button>}
        {!a && <p className="muted small">Abra ou coloque uma imagem para começar.</p>}
      </div>
    );
  }
  const change = (k: keyof Adjust) => (v: number) => { setLocal((s) => ({ ...s, [k]: v })); live({ [k]: v }); };
  const commitK = (k: keyof Adjust, label: string) => (v: number) => e.setAdjust(o!, { [k]: v }, label);
  const toggle = (k: 'grayscale' | 'sepia' | 'invert', label: string) => e.setAdjust(o!, { [k]: !local[k] }, label);

  return (
    <div className="adjust">
      <Looks e={e} img={o!} cur={local} onPick={(lut) => { setLocal((s) => ({ ...s, lut })); e.setAdjust(o!, { lut }, lut ? 'Look' : 'Remover look'); }} />
      {local.lut && (
        <Slider label="Intensidade do look" value={local.lutAmount} min={0} max={1} format={(v) => `${Math.round(v * 100)}%`}
          onChange={change('lutAmount')} onCommit={commitK('lutAmount', 'Intensidade do look')} />
      )}
      <Section title="Luz e cor" right={<button className="link" onClick={() => { setLocal(DEFAULT_ADJUST); e.setAdjust(o!, DEFAULT_ADJUST, 'Redefinir ajustes'); }}>Redefinir</button>}>
        {ADJ.map((a) => (
          <Slider key={a.k} label={a.label} value={local[a.k] as number} min={a.min} max={a.max} step={a.step} center={a.center}
            format={a.fmt || ((v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`)} onChange={change(a.k)} onCommit={commitK(a.k, a.label)} />
        ))}
      </Section>
      <Section title="Detalhe e efeitos">
        {FX.map((a) => (
          <Slider key={a.k} label={a.label} value={local[a.k] as number} min={a.min} max={a.max} step={a.step}
            format={a.fmt || ((v) => `${Math.round(v * 100)}`)} onChange={change(a.k)} onCommit={commitK(a.k, a.label)} />
        ))}
        <div className="chips">
          <button className={`chip ${local.grayscale ? 'on' : ''}`} onClick={() => toggle('grayscale', 'Preto e branco')}>P&B</button>
          <button className={`chip ${local.sepia ? 'on' : ''}`} onClick={() => toggle('sepia', 'Sépia')}>Sépia</button>
          <button className={`chip ${local.invert ? 'on' : ''}`} onClick={() => toggle('invert', 'Inverter')}>Inverter</button>
        </div>
      </Section>
    </div>
  );
}

function Looks({ e, img, cur, onPick }: { e: FormaEngine; img: FabricImage & { id?: string }; cur: Adjust; onPick: (id: string) => void }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const el = ((img as any)._originalElement || img.getElement()) as HTMLImageElement | HTMLCanvasElement;
    const W = 84, ratio = (el.height || 1) / (el.width || 1);
    const H = Math.max(40, Math.min(84, Math.round(W * ratio)));
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    const bx = base.getContext('2d')!;
    const s = Math.max(W / el.width, H / el.height);
    bx.drawImage(el, (W - el.width * s) / 2, (H - el.height * s) / 2, el.width * s, el.height * s);
    const src = bx.getImageData(0, 0, W, H);
    const out: Record<string, string> = { '': base.toDataURL('image/jpeg', 0.8) };
    let i = 0;
    const step = () => {
      if (cancelled) return;
      const l = LUTS[i++];
      if (!l) return;
      const d = new ImageData(new Uint8ClampedArray(src.data), W, H);
      applyLut(d.data, lutBytes(l.id)!, 1);
      bx.putImageData(d, 0, 0);
      out[l.id] = base.toDataURL('image/jpeg', 0.8);
      setThumbs({ ...out });
      requestAnimationFrame(step);
    };
    setThumbs({ ...out });
    requestAnimationFrame(step);
    return () => { cancelled = true; };
  }, [img.id]); // eslint-disable-line react-hooks/exhaustive-deps
  void e;
  return (
    <Section title="Looks" right={<span className="muted small">{LUTS.length} LUTs</span>}>
      <div className="looks">
        <button className={`look ${!cur.lut ? 'on' : ''}`} onClick={() => onPick('')}>
          <span className="look-img" style={{ backgroundImage: thumbs[''] ? `url(${thumbs['']})` : undefined }} />
          <span>Original</span>
        </button>
        {LUTS.map((l) => (
          <button key={l.id} className={`look ${cur.lut === l.id ? 'on' : ''}`} onClick={() => onPick(l.id)}>
            <span className="look-img" style={{ backgroundImage: thumbs[l.id] ? `url(${thumbs[l.id]})` : undefined }} />
            <span>{l.name}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

// ───────────────────────── Camadas ─────────────────────────
function useThumbs(e: FormaEngine) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const key = `${e.historyIndex}:${e.history.length}:${e.layers().length}`;
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next: Record<string, string> = {};
      for (const o of e.layers()) {
        try {
          const w = o.getScaledWidth(), h = o.getScaledHeight();
          if (w < 1 || h < 1) continue;
          const vis = o.visible;
          o.visible = true;
          next[o.id!] = o.toDataURL({ multiplier: Math.min(1, 56 / Math.max(w, h)), format: 'png' });
          o.visible = vis;
        } catch { /* ignora */ }
      }
      setThumbs(next);
    }, 120);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return thumbs;
}

const KIND_ICON: Record<LayerKind, JSX.Element> = {
  image: <ImageIcon size={11} />, text: <Type size={11} />, shape: <Shapes size={11} />, paint: <Brush size={11} />, group: <Folder size={11} />, element: <Sparkles size={11} />,
};

export function LayersPanel({ e }: { e: FormaEngine }) {
  const layers = e.layerInfo();
  const thumbs = useThumbs(e);
  const act = e.active();
  const actInfo = layers.find((l) => l.selected);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => setOpacity(actInfo?.opacity ?? 1), [actInfo?.id, actInfo?.opacity]);

  return (
    <div className="layers">
      <div className="layers-head">
        <Select value={(actInfo?.blend || 'source-over') as string} width="58%" options={BLEND_MODES}
          onChange={(v) => actInfo && e.setLayerProp(actInfo.id, { blend: v })} />
        <div className="opac">
          <span className="muted small">Opac.</span>
          <NumField value={Math.round(opacity * 100)} min={0} max={100} suffix="%" onCommit={(v) => actInfo && e.setLayerProp(actInfo.id, { opacity: v / 100 })} />
        </div>
      </div>
      {actInfo && (
        <div className="layers-opslider">
          <input type="range" min={0} max={1} step={0.01} value={opacity}
            onChange={(ev) => { const v = parseFloat(ev.target.value); setOpacity(v); e.setLayerProp(actInfo.id, { opacity: v }, false); }}
            onPointerUp={() => e.commit('Opacidade')} />
        </div>
      )}
      <ul className="layer-list" onDragLeave={() => setOverIdx(null)}>
        {layers.map((l, i) => (
          <li
            key={l.id}
            className={`layer ${l.selected ? 'sel' : ''} ${!l.visible ? 'hidden' : ''} ${dragId === l.id ? 'dragging' : ''} ${overIdx === i && dragId !== l.id ? 'over' : ''}`}
            draggable={editing !== l.id}
            onDragStart={(ev) => { setDragId(l.id); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', l.id); }}
            onDragOver={(ev) => { ev.preventDefault(); setOverIdx(i); }}
            onDrop={(ev) => { ev.preventDefault(); if (dragId) e.moveLayer(dragId, i); setDragId(null); setOverIdx(null); }}
            onDragEnd={() => { setDragId(null); setOverIdx(null); }}
            onClick={(ev) => { if (!l.locked) e.selectLayer(l.id, ev.shiftKey || ev.metaKey || ev.ctrlKey); }}
          >
            <button className="layer-eye" onClick={(ev) => { ev.stopPropagation(); e.setLayerProp(l.id, { visible: !l.visible }); }} aria-label={l.visible ? 'Ocultar' : 'Mostrar'}>
              {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <span className="layer-thumb">{thumbs[l.id] ? <img src={thumbs[l.id]} alt="" /> : KIND_ICON[l.kind]}</span>
            <span className="layer-name" onDoubleClick={(ev) => { ev.stopPropagation(); setEditing(l.id); }}>
              {editing === l.id ? (
                <input autoFocus defaultValue={l.name}
                  onBlur={(ev) => { e.setLayerProp(l.id, { name: ev.target.value }); setEditing(null); }}
                  onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); if (ev.key === 'Escape') setEditing(null); }} />
              ) : (
                <>
                  <span className="layer-kind">{KIND_ICON[l.kind]}</span>
                  <span className="ellip">{l.name}</span>
                  {l.blend !== 'source-over' && <span className="layer-badge">{BLEND_MODES.find((b) => b.id === l.blend)?.label}</span>}
                </>
              )}
            </span>
            <button className={`layer-lock ${l.locked ? 'on' : ''}`} onClick={(ev) => { ev.stopPropagation(); e.setLayerProp(l.id, { locked: !l.locked }); }} aria-label={l.locked ? 'Desbloquear' : 'Bloquear'}>
              {l.locked ? <Lock size={12} /> : <LockOpen size={12} />}
            </button>
          </li>
        ))}
        <li className="layer bgrow" onClick={() => e.deselect()}>
          <span className="layer-eye" />
          <span className="layer-thumb" style={{ background: e.doc.background || undefined }} data-transparent={!e.doc.background} />
          <span className="layer-name"><span className="ellip">Fundo do documento</span></span>
          <span className="layer-lock on"><Lock size={12} /></span>
        </li>
      </ul>
      <div className="layers-foot">
        <IconBtn tip="Nova camada (Ctrl+Shift+N)" onClick={() => e.newPaintLayer()}><Plus size={15} /></IconBtn>
        <IconBtn tip="Duplicar (Ctrl+J)" onClick={() => e.duplicateSelected()} disabled={!act}><Copy size={14} /></IconBtn>
        <IconBtn tip="Agrupar (Ctrl+G)" onClick={() => e.groupSelected()} disabled={e.selectedLayers().length < 2}><Folder size={14} /></IconBtn>
        <IconBtn tip="Mesclar abaixo (Ctrl+E)" onClick={() => e.mergeDown()} disabled={!act}><Layers size={14} /></IconBtn>
        <span className="spacer" />
        <IconBtn tip="Excluir camada" onClick={() => { e.setMarquee(null); e.deleteSelected(); }} disabled={!act}><Trash size={14} /></IconBtn>
      </div>
    </div>
  );
}

// ───────────────────────── Histórico ─────────────────────────
export function HistoryPanel({ e }: { e: FormaEngine }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    ref.current?.querySelector('.cur')?.scrollIntoView({ block: 'nearest' });
  }, [e.historyIndex]);
  return (
    <ul className="history" ref={ref}>
      {e.history.map((h, i) => (
        <li key={i} className={`${i === e.historyIndex ? 'cur' : ''} ${i > e.historyIndex ? 'future' : ''}`} onClick={() => e.gotoHistory(i)}>
          <span className="hdot" />
          {h.label}
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── coluna direita com abas ─────────────────────────
type TopTab = 'props' | 'adjust' | 'color';
type BottomTab = 'layers' | 'history';

export function RightColumn({ e }: { e: FormaEngine }) {
  const [top, setTop] = useState<TopTab>('props');
  const [bottom, setBottom] = useState<BottomTab>('layers');
  const isImg = e.active() instanceof FabricImage;
  const prevImg = useRef(isImg);
  useEffect(() => {
    if (isImg && !prevImg.current && top === 'props') setTop('adjust');
    if (!isImg && prevImg.current && top === 'adjust') setTop('props');
    prevImg.current = isImg;
  }, [isImg]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabs = useMemo(() => [
    { id: 'props' as const, label: 'Propriedades', icon: <Settings2 size={13} /> },
    { id: 'adjust' as const, label: 'Ajustes', icon: <SlidersHorizontal size={13} /> },
    { id: 'color' as const, label: 'Cor', icon: <Palette size={13} /> },
  ], []);
  return (
    <aside className="rightcol">
      <div className="card panel-top">
        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t.id} className={top === t.id ? 'on' : ''} onClick={() => setTop(t.id)}>{t.icon}{t.label}</button>
          ))}
        </nav>
        <div className="panel-scroll">
          {top === 'props' && <PropertiesPanel e={e} />}
          {top === 'adjust' && <AdjustPanel e={e} />}
          {top === 'color' && <ColorPanel e={e} />}
        </div>
      </div>
      <div className="card panel-bottom">
        <nav className="tabs">
          <button className={bottom === 'layers' ? 'on' : ''} onClick={() => setBottom('layers')}><Layers size={13} />Camadas</button>
          <button className={bottom === 'history' ? 'on' : ''} onClick={() => setBottom('history')}><ClockFading size={13} />Histórico</button>
        </nav>
        {bottom === 'layers' ? <LayersPanel e={e} /> : <div className="panel-scroll"><HistoryPanel e={e} /></div>}
      </div>
    </aside>
  );
}

