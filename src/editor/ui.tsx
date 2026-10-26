import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { FormaEngine } from './engine';

// Ícones de ferramentas (Tabler Icons, MIT) vindos do PhotoSplice — assets/ico/tools
const toolSvgs = import.meta.glob('../assets/tools/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const TOOL_ICONS: Record<string, string> = {};
for (const [path, svg] of Object.entries(toolSvgs)) {
  TOOL_ICONS[path.split('/').pop()!.replace('.svg', '')] = svg.replace(/<style>[\s\S]*?<\/style>/, '').replace(/class="shp0"/g, 'fill="currentColor"');
}

export function ToolIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <span className="tool-ico" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: TOOL_ICONS[name] || '' }} />;
}

export function useEngine(e: FormaEngine | null) {
  useSyncExternalStore(e ? e.subscribe : noopSub, e ? e.getVersion : zero);
}
const noopSub = () => () => {};
const zero = () => 0;

export function Slider({
  label, value, min, max, step = 0.01, onChange, onCommit, format, center,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; onCommit?: (v: number) => void;
  format?: (v: number) => string; center?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const zeroPct = center ? ((0 - min) / (max - min)) * 100 : 0;
  const lo = Math.min(pct, zeroPct), hi = Math.max(pct, zeroPct);
  return (
    <label className="slider">
      <span className="slider-row">
        <span className="slider-label">{label}</span>
        <span className="slider-val" onDoubleClick={() => { onChange(center ? 0 : min); onCommit?.(center ? 0 : min); }}>
          {format ? format(value) : Math.round(value * 100) / 100}
        </span>
      </span>
      <span className="slider-track">
        <span className="slider-fill" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onPointerUp={(e) => onCommit?.(parseFloat((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => onCommit?.(parseFloat((e.target as HTMLInputElement).value))}
        />
      </span>
    </label>
  );
}

export function NumField({
  label, value, onCommit, suffix, min, max, step = 1, width,
}: {
  label?: string; value: number; onCommit: (v: number) => void; suffix?: string;
  min?: number; max?: number; step?: number; width?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(step >= 1 ? Math.round(value) : Math.round(value * 100) / 100);
  const commit = () => {
    if (draft === null) return;
    const v = parseFloat(draft.replace(',', '.'));
    setDraft(null);
    if (!isNaN(v)) onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
  };
  const drag = useRef<{ x: number; v: number } | null>(null);
  return (
    <label className="numfield" style={width ? { width } : undefined}>
      {label && (
        <span
          className="numfield-label"
          onPointerDown={(e) => { drag.current = { x: e.clientX, v: value }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const v = drag.current.v + Math.round((e.clientX - drag.current.x) / 2) * step;
            setDraft(String(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))));
          }}
          onPointerUp={() => { drag.current = null; commit(); }}
        >{label}</span>
      )}
      <input
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value + d)));
            setDraft(null);
          }
          e.stopPropagation();
        }}
      />
      {suffix && <span className="numfield-suffix">{suffix}</span>}
    </label>
  );
}

export function Select<T extends string>({ value, options, onChange, width }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; width?: number | string }) {
  return (
    <span className="select" style={width ? { width } : undefined}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </span>
  );
}

export function IconBtn({ tip, onClick, children, active, disabled, className = '' }: { tip: string; onClick?: () => void; children: ReactNode; active?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button type="button" className={`iconbtn ${active ? 'on' : ''} ${className}`} data-tip={tip} aria-label={tip} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Section({ title, children, right, defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`psec ${open ? 'open' : ''}`}>
      <header onClick={() => setOpen(!open)}>
        <span className="psec-caret">▸</span>
        <span>{title}</span>
        <span className="psec-right" onClick={(e) => e.stopPropagation()}>{right}</span>
      </header>
      {open && <div className="psec-body">{children}</div>}
    </section>
  );
}

export function Modal({ title, onClose, children, width = 520, footer }: { title: string; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width }} role="dialog" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

// ───────────── seletor de cor HSV ─────────────
function hexToHsv(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: ((h * 60) + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return '#' + [f(5), f(3), f(1)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export function normHex(v: string) {
  let h = v.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(h) ? '#' + h.toLowerCase() : null;
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) { setHsv(hexToHsv(value)); last.current = value; }
  }, [value]);
  const set = (n: { h: number; s: number; v: number }) => {
    setHsv(n);
    const hex = hsvToHex(n.h, n.s, n.v);
    last.current = hex;
    onChange(hex);
  };
  const sv = useRef<HTMLDivElement>(null);
  const hue = useRef<HTMLDivElement>(null);
  const track = (ref: React.RefObject<HTMLDivElement | null>, fn: (x: number, y: number) => void) => (e: React.PointerEvent) => {
    const el = ref.current!;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent | React.PointerEvent) => {
      const r = el.getBoundingClientRect();
      fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    move(e);
    const up = () => { el.removeEventListener('pointermove', move as any); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move as any);
    el.addEventListener('pointerup', up);
  };
  return (
    <div className="cpick">
      <div ref={sv} className="cpick-sv" style={{ background: `hsl(${hsv.h} 100% 50%)` }} onPointerDown={track(sv, (x, y) => set({ ...hsv, s: x, v: 1 - y }))}>
        <span className="cpick-dot" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: value }} />
      </div>
      <div ref={hue} className="cpick-hue" onPointerDown={track(hue, (x) => set({ ...hsv, h: x * 359.9 }))}>
        <span className="cpick-knob" style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>
    </div>
  );
}

export const SWATCHES = [
  '#000000', '#ffffff', '#7c5cff', '#d4ff3a', '#ff5c7a', '#ff9f43', '#ffd84d', '#3ddc97',
  '#2ec5ff', '#3b5bff', '#a259ff', '#ff6bd6', '#1b1b24', '#4a4a5c', '#9a9ab0', '#e8e8f0',
];
