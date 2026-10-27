import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Upload, Check, Trash, X } from 'lucide-react';
import {
  CATALOG, CATEGORIES, FONT_COUNT, addCustomFont, categoryOf, customFonts, ensureFont, isLoaded, loadPreview,
  onFontsChange, pushRecent, recentFonts, removeCustomFont, type FontCat,
} from './fonts';

type Props = {
  value: string;
  onChange: (family: string) => void;
  /** Mostra a fonte na tela ao passar o mouse; null = voltar à original. */
  onPreview?: (family: string | null) => void;
  width?: number | string;
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Row({ family, selected, active, onPick, onHover, onRemove, root }: {
  family: string; selected: boolean; active: boolean; onPick: () => void; onHover: () => void; onRemove?: () => void; root: HTMLElement | null;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isLoaded(family)) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((x) => x.isIntersecting)) { loadPreview(family); io.disconnect(); }
    }, { root, rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [family, root]);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest' }); }, [active]);
  return (
    <button ref={ref} type="button" className={`fp-row ${selected ? 'sel' : ''} ${active ? 'on' : ''}`}
      onClick={onPick} onPointerEnter={onHover} role="option" aria-selected={selected}>
      <span className="fp-name" style={{ fontFamily: `"${family}", var(--font)` }}>{family}</span>
      {onRemove && <span className="fp-del" role="button" aria-label={`Remover ${family}`} onClick={(ev) => { ev.stopPropagation(); onRemove(); }}><Trash size={12} /></span>}
      {selected && <Check size={14} className="fp-check" />}
    </button>
  );
}

export function FontPicker({ value, onChange, onPreview, width }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<FontCat | 'all' | 'recent'>('all');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);
  const [, bump] = useState(0);
  const [err, setErr] = useState('');
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hoverT = useRef(0);
  const previewing = useRef(false);

  useEffect(() => onFontsChange(() => bump((n) => n + 1)), []);
  // a fonte atual aparece no botão com o próprio desenho
  useEffect(() => { if (value) ensureFont(value).then(() => bump((n) => n + 1)); }, [value]);

  const place = () => {
    const r = btn.current!.getBoundingClientRect();
    const W = 300, H = 440, vh = window.innerHeight, vw = window.innerWidth;
    const below = vh - r.bottom - 12, above = r.top - 12;
    const down = below >= Math.min(H, 320) || below >= above;
    const maxH = Math.min(H, down ? below : above);
    setPos({ left: Math.max(8, Math.min(vw - W - 8, r.left)), top: down ? r.bottom + 6 : r.top - 6 - maxH, maxH });
  };
  useLayoutEffect(() => { if (open) place(); }, [open]);

  const close = (commit = false) => {
    clearTimeout(hoverT.current);
    if (previewing.current && !commit) onPreview?.(null);
    previewing.current = false;
    setOpen(false);
    setQ('');
    setErr('');
  };

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const re = () => place();
    window.addEventListener('pointerdown', off, true);
    window.addEventListener('resize', re);
    return () => { window.removeEventListener('pointerdown', off, true); window.removeEventListener('resize', re); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const families = useMemo(() => {
    const n = norm(q.trim());
    let base: string[];
    if (cat === 'recent') base = recentFonts();
    else if (cat === 'custom') base = customFonts();
    else if (cat === 'all') base = [...customFonts(), ...CATALOG.map((f) => f.family)];
    else base = CATALOG.filter((f) => f.cat === cat).map((f) => f.family);
    return n ? base.filter((f) => norm(f).includes(n)) : base;
  }, [q, cat, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [q, cat]);

  const pick = (family: string) => {
    pushRecent(family);
    onChange(family);
    close(true);
  };
  const hover = (family: string, i: number) => {
    setActive(i);
    if (!onPreview) return;
    clearTimeout(hoverT.current);
    hoverT.current = window.setTimeout(() => {
      previewing.current = true;
      ensureFont(family).then(() => onPreview(family));
    }, 160);
  };

  return (
    <>
      <button ref={btn} type="button" className="fp-btn" style={width ? { width } : undefined}
        onClick={() => (open ? close() : setOpen(true))} aria-haspopup="listbox" aria-expanded={open}>
        <span className="ellip" style={{ fontFamily: `"${value}", var(--font)` }}>{value}</span>
        <ChevronDown size={13} />
      </button>
      {open && pos && (
        <div ref={pop} className="fp-pop" style={{ left: pos.left, top: pos.top, maxHeight: pos.maxH }}
          onPointerLeave={() => { clearTimeout(hoverT.current); if (previewing.current) { previewing.current = false; onPreview?.(null); } }}>
          <div className="fp-search">
            <Search size={14} />
            <input autoFocus placeholder={`Buscar entre ${FONT_COUNT} fontes`} value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') close();
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(families.length - 1, a + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                if (e.key === 'Enter' && families[active]) pick(families[active]);
              }} />
            {q && <button type="button" className="iconbtn" onClick={() => setQ('')} aria-label="Limpar"><X size={12} /></button>}
          </div>
          <div className="fp-cats">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
            ))}
          </div>
          <div className="fp-list" ref={list} role="listbox">
            {families.map((f, i) => (
              <Row key={`${cat}-${f}`} family={f} selected={f === value} active={i === active} root={list.current}
                onPick={() => pick(f)} onHover={() => hover(f, i)}
                onRemove={categoryOf(f) === 'custom' ? () => removeCustomFont(f) : undefined} />
            ))}
            {!families.length && (
              <div className="fp-empty">
                {cat === 'recent' ? 'As fontes que você usar aparecem aqui.'
                  : cat === 'custom' ? 'Envie um arquivo .ttf, .otf ou .woff para usar sua própria fonte.'
                    : `Nenhuma fonte com “${q}”.`}
              </div>
            )}
          </div>
          <div className="fp-foot">
            <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}><Upload size={13} />Enviar fonte</button>
            <span className="muted small">{err || 'Google Fonts · carregadas ao usar'}</span>
            <input ref={fileRef} type="file" hidden accept=".ttf,.otf,.woff,.woff2"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try { const name = await addCustomFont(file); setErr(''); pick(name); } catch (x: any) { setErr(x.message); }
              }} />
          </div>
        </div>
      )}
    </>
  );
}
