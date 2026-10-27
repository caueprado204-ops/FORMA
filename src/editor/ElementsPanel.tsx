import { useEffect, useMemo, useState } from 'react';
import { Search, X, Loader } from 'lucide-react';
import { ELEMENTS, ELEMENT_CATS, colorize, svgDataUri, type ElementCat, type ElementDef } from './elements';
import { ELEMENT_MIME, type Inserter } from './library-types';
import { SWATCHES } from './ui';

type IconsMod = typeof import('./icons');
type Item = { key: string; name: string; svg: string; gradient?: ElementDef['gradient'] };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function Tile({ item, ins, preview }: { item: Item; ins: Inserter; preview: string }) {
  const src = useMemo(() => svgDataUri(colorize(item.svg, preview)), [item.svg, preview]);
  return (
    <button type="button" className={`el-tile ${item.gradient ? 'grad' : ''}`} title={item.name} aria-label={`Inserir ${item.name}`}
      draggable={ins.canDrag}
      onDragStart={(ev) => {
        ev.dataTransfer.setData(ELEMENT_MIME, JSON.stringify({ svg: item.svg, name: item.name, gradient: item.gradient }));
        ev.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => ins.element(item.svg, item.name, { gradient: item.gradient })}>
      <img src={src} alt="" draggable={false} />
    </button>
  );
}

const fromDef = (d: ElementDef): Item => ({ key: d.id, name: d.name, svg: d.svg, gradient: d.gradient });

export function ElementsPanel({ ins }: { ins: Inserter }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ElementCat | 'tudo'>('tudo');
  const [topic, setTopic] = useState('');
  const [mod, setMod] = useState<IconsMod | null>(null);
  const [limit, setLimit] = useState(120);

  useEffect(() => { import('./icons').then(setMod); }, []);
  useEffect(() => setLimit(120), [q, cat, topic]);

  const preview = luminance(ins.color) < 0.12 ? '#ededf4' : ins.color;
  const iconItem = (k: string, name: string): Item => ({ key: `i-${k}`, name: `Ícone ${name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`, svg: mod!.iconSvg(k) });

  const n = norm(q);
  const elementMatches = n ? ELEMENTS.filter((d) => norm(`${d.name} ${d.keywords || ''} ${d.cat}`).includes(n)).map(fromDef) : [];
  const iconMatches = mod ? (n ? mod.searchIcons(q, 300) : topic ? mod.searchIcons(topic, 300) : mod.ICONS) : [];

  const grid = (items: Item[], more?: () => void) => (
    <>
      <div className="el-grid">{items.map((it) => <Tile key={it.key} item={it} ins={ins} preview={preview} />)}</div>
      {more && <button className="btn ghost sm block" onClick={more}>Mostrar mais</button>}
    </>
  );

  return (
    <div className="bank-body">
      <div className="bank-search">
        <Search size={14} />
        <input id="el-q" placeholder="Buscar elementos e ícones (ex.: casa, seta)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        {q && <button className="iconbtn" onClick={() => setQ('')} aria-label="Limpar busca"><X size={13} /></button>}
      </div>

      <div className="el-color">
        <span className="muted small">Cor</span>
        {SWATCHES.slice(0, 11).map((c) => (
          <button key={c} className={`el-sw ${ins.color.toLowerCase() === c ? 'on' : ''}`} style={{ background: c }} onClick={() => ins.setColor?.(c)} aria-label={`Cor ${c}`} />
        ))}
        <label className="el-sw custom" style={{ background: ins.color }} aria-label="Outra cor">
          <input type="color" value={ins.color} onChange={(e) => ins.setColor?.(e.target.value)} />
        </label>
      </div>

      {!n && (
        <div className="chips bank-chips">
          <button className={`chip ${cat === 'tudo' ? 'on' : ''}`} onClick={() => setCat('tudo')}>Tudo</button>
          {ELEMENT_CATS.map((c) => <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => { setCat(c.id); setTopic(''); }}>{c.label}</button>)}
        </div>
      )}

      {n ? (
        <>
          {elementMatches.length > 0 && <><h4 className="el-h">Elementos</h4>{grid(elementMatches)}</>}
          <h4 className="el-h">Ícones {mod && <span className="muted">· {iconMatches.length}</span>}</h4>
          {!mod ? <div className="bank-state"><Loader size={16} className="spin" />Carregando ícones…</div>
            : iconMatches.length ? grid(iconMatches.slice(0, limit).map((i) => iconItem(i.id, i.name)), iconMatches.length > limit ? () => setLimit(limit + 120) : undefined)
              : <div className="bank-state">Nenhum ícone para “{q}”. Tente em inglês, como “house”.</div>}
        </>
      ) : cat === 'tudo' ? (
        ELEMENT_CATS.map((c) => {
          const items = c.id === 'icones'
            ? (mod ? ['House', 'Heart', 'Star', 'ArrowRight', 'Camera', 'MessageCircle', 'ShoppingBag', 'Sparkles'].map((k) => iconItem(k, k)) : [])
            : ELEMENTS.filter((d) => d.cat === c.id).slice(0, 8).map(fromDef);
          return (
            <section key={c.id} className="el-sec">
              <header><h4 className="el-h">{c.label}</h4><button className="link" onClick={() => setCat(c.id)}>Ver tudo</button></header>
              {items.length ? grid(items) : <div className="bank-state"><Loader size={16} className="spin" /></div>}
            </section>
          );
        })
      ) : cat === 'icones' ? (
        <>
          {mod && (
            <div className="chips bank-chips">
              <button className={`chip ${!topic ? 'on' : ''}`} onClick={() => setTopic('')}>Todos · {mod.ICON_COUNT}</button>
              {mod.ICON_TOPICS.map((t) => <button key={t.q} className={`chip ${topic === t.q ? 'on' : ''}`} onClick={() => setTopic(t.q)}>{t.label}</button>)}
            </div>
          )}
          {!mod ? <div className="bank-state"><Loader size={16} className="spin" />Carregando ícones…</div>
            : grid(iconMatches.slice(0, limit).map((i) => iconItem(i.id, i.name)), iconMatches.length > limit ? () => setLimit(limit + 120) : undefined)}
          <p className="bank-note">Ícones Lucide (licença ISC). Depois de inserir, mude cor e espessura do traço em Propriedades.</p>
        </>
      ) : (
        <>
          {grid(ELEMENTS.filter((d) => d.cat === cat).map(fromDef))}
          {cat === 'gradientes' && <p className="bank-note">O gradiente entra do tamanho do documento, atrás das outras camadas.</p>}
          {cat !== 'gradientes' && <p className="bank-note">Todos entram como camada editável. Mude a cor em Propriedades; textos dos adesivos podem ser editados depois de desagrupar (Ctrl+Shift+G).</p>}
        </>
      )}
    </div>
  );
}
