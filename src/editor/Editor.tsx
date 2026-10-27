import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FabricImage } from 'fabric';
import {
  ChevronDown, Command as CommandIcon, Download, FilePlus, FolderOpen, ImagePlus, Keyboard, Maximize, Minus,
  PanelRight, Plus, Redo2, Search, Undo2, ArrowLeft, Monitor, Smartphone, Presentation, Square, FileImage, Clock, Images,
} from 'lucide-react';
import { BANK_MIME, ImageBank } from './ImageBank';
import { FormaEngine, type Doc, type ToolId } from './engine';
import { COMMANDS, MENUS, TOOLS, eventCombo, formatKeys, type Command, type MenuId, type UiApi } from './commands';
import { IconBtn, Modal, NumField, Select, Slider, ToolIcon, useEngine } from './ui';
import { RightColumn } from './panels';
import { Logo } from '../Logo';

type DialogId = 'new' | 'export' | 'size' | 'shortcuts' | 'palette' | null;

export default function Editor({ goHome }: { goHome: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileMode = useRef<'open' | 'place'>('open');
  const [engine, setEngine] = useState<FormaEngine | null>(null);
  const [dialog, setDialog] = useState<DialogId>(null);
  const [panels, setPanels] = useState(true);
  const [dropping, setDropping] = useState(false);
  // banco de imagens: abre sozinho ao voltar do login do Pinterest
  const [bank, setBank] = useState(() => new URLSearchParams(location.search).has('pinterest'));
  useEngine(engine);

  useEffect(() => {
    // o <canvas> é criado fora do React: o Fabric envolve o elemento em seus próprios nós
    const host = hostRef.current!;
    const el = document.createElement('canvas');
    host.appendChild(el);
    const e = new FormaEngine(el, host);
    setEngine(e);
    (window as any).forma = e;
    if (window.innerWidth < 900) setPanels(false);
    return () => { e.destroy(); host.innerHTML = ''; };
  }, []);

  const ui: UiApi = useMemo(() => ({
    open: (mode) => { fileMode.current = mode; fileRef.current?.click(); },
    dialog: (d) => setDialog(d),
    saveProject: () => {
      if (!engine) return;
      const blob = new Blob([JSON.stringify(engine.projectJSON())], { type: 'application/json' });
      download(URL.createObjectURL(blob), `${slug(engine.doc.name)}.forma`);
      engine.notify('Projeto salvo');
    },
    togglePanel: () => setPanels((p) => !p),
    toggleBank: () => setBank((b) => !b),
    goHome,
  }), [engine, goHome]);

  const run = useCallback((c: Command) => {
    if (!engine) return;
    if (!engine.hasDoc && !['new', 'open', 'home', 'shortcuts', 'palette', 'panel', 'bank'].includes(c.id)) {
      setDialog('new');
      return;
    }
    c.run(engine, ui);
  }, [engine, ui]);

  // ───────── teclado ─────────
  useEffect(() => {
    if (!engine) return;
    const down = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing && t.tagName !== 'TEXTAREA') return;
      if (engine.isEditingText()) {
        if (ev.key === 'Escape') { (engine.canvas.getActiveObject() as any)?.exitEditing(); engine.canvas.requestRenderAll(); }
        return;
      }
      if (dialog) return;
      if (ev.code === 'Space') { ev.preventDefault(); engine.holdSpace(true); return; }
      if (engine.tool === 'crop') {
        if (ev.key === 'Enter') { ev.preventDefault(); engine.commitCrop(); return; }
        if (ev.key === 'Escape') { ev.preventDefault(); engine.cancelCrop(); return; }
      }
      if (ev.key === 'Escape') { engine.deselect(); return; }
      const combo = eventCombo(ev);
      // tamanho/dureza do pincel
      if (combo === '[' || combo === ']') { engine.setBrush({ size: engine.brush.size * (combo === ']' ? 1.15 : 1 / 1.15) + (combo === ']' ? 1 : -1) }); return; }
      if (combo === 'shift+[' || combo === 'shift+]') { engine.setBrush({ hardness: Math.min(1, Math.max(0, engine.brush.hardness + (combo === 'shift+]' ? 0.1 : -0.1))) }); return; }
      // setas
      const arrows: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
      const arrowKey = ev.key.toLowerCase();
      if (arrows[arrowKey]) {
        const m = ev.shiftKey ? 10 : 1;
        if (engine.nudge(arrows[arrowKey][0] * m, arrows[arrowKey][1] * m)) ev.preventDefault();
        return;
      }
      // opacidade por número (como no Photoshop)
      if (/^[0-9]$/.test(combo) && engine.active()) {
        const v = combo === '0' ? 1 : parseInt(combo) / 10;
        const a = engine.active()!;
        if (engine.tool === 'brush') engine.setBrush({ opacity: v });
        else engine.setLayerProp((a as any).id, { opacity: v });
        return;
      }
      const cmd = COMMANDS.find((c) => c.keys === combo);
      if (cmd) { ev.preventDefault(); run(cmd); return; }
      const tool = !ev.ctrlKey && !ev.metaKey && !ev.altKey ? TOOLS.find((x) => x.key === combo) : null;
      if (tool) { ev.preventDefault(); if (engine.hasDoc) engine.setTool(tool.id); }
    };
    const up = (ev: KeyboardEvent) => { if (ev.code === 'Space') engine.holdSpace(false); };
    const paste = async (ev: ClipboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') || engine.isEditingText()) return;
      const file = Array.from(ev.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
      if (file) { ev.preventDefault(); await engine.openFile(file, 'place'); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('paste', paste);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('paste', paste); };
  }, [engine, dialog, run]);

  // abre o diálogo inicial (ou o banco, na volta do login do Pinterest)
  useEffect(() => {
    if (!engine) return;
    const status = new URLSearchParams(location.search).get('pinterest');
    if (status) {
      history.replaceState(null, '', location.pathname + location.hash);
      const msg: Record<string, string> = { conectado: 'Pinterest conectado', cancelado: 'Conexão com o Pinterest cancelada', erro: 'Não foi possível conectar o Pinterest' };
      if (!engine.hasDoc) {
        const saved = FormaEngine.savedProject();
        if (saved?.objects?.length) engine.loadProject(saved);
        else engine.newDocument({ name: 'Sem título', width: 1080, height: 1350, background: '#ffffff' });
      }
      engine.notify(msg[status] || msg.erro);
      return;
    }
    if (!engine.hasDoc) setDialog('new');
  }, [engine]);

  const e = engine;
  const toolInfo = TOOLS.find((t) => t.id === (e?.tool || 'move'))!;

  return (
    <div className={`editor ${panels ? '' : 'nopanels'}`}>
      {e && <TopBar e={e} run={run} ui={ui} />}
      {e && <OptionsBar e={e} hint={toolInfo.hint} />}
      {e && <ToolBar e={e} bank={bank} onBank={() => setBank((b) => !b)} />}
      <main
        className={`stage card ${dropping ? 'dropping' : ''}`}
        onDragOver={(ev) => {
          const t = ev.dataTransfer.types;
          if (t.includes(BANK_MIME)) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; }
          else if (t.includes('Files')) { ev.preventDefault(); setDropping(true); }
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={async (ev) => {
          ev.preventDefault();
          if (!e) return;
          setDropping(false);
          const fromBank = ev.dataTransfer.getData(BANK_MIME);
          if (fromBank) {
            const { url, name } = JSON.parse(fromBank);
            await e.placeRemote(url, name, { x: ev.clientX, y: ev.clientY });
            return;
          }
          const files = Array.from(ev.dataTransfer.files);
          for (const f of files) await e.openFile(f, e.hasDoc ? 'place' : 'open');
          if (files.length) setDialog(null);
        }}
      >
        <div className="workspace" ref={hostRef} />
        {e && e.tool === 'crop' && (
          <div className="floatbar">
            <span>Ajuste a moldura</span>
            <button className="btn ghost sm" onClick={() => e.cancelCrop()}>Cancelar</button>
            <button className="btn lime sm" onClick={() => e.commitCrop()}>Aplicar corte ↵</button>
          </div>
        )}
        {e && e.marquee && e.tool !== 'crop' && (
          <div className="floatbar">
            <span>Seleção ativa</span>
            <button className="btn ghost sm" onClick={() => e.copySelectionToLayer()}>Nova camada</button>
            <button className="btn ghost sm" onClick={() => e.fillSelection(e.fg)}>Preencher</button>
            <button className="btn ghost sm" onClick={() => e.cropToSelection()}>Cortar</button>
            <button className="btn ghost sm" onClick={() => e.deselect()}>Desmarcar</button>
          </div>
        )}
        {dropping && <div className="dropzone"><ImagePlus size={28} />Solte a imagem para {e?.hasDoc ? 'colocar como camada' : 'abrir'}</div>}
        {e && bank && <ImageBank e={e} onClose={() => setBank(false)} />}
        {e && <Toast e={e} />}
      </main>
      {e && panels && <RightColumn e={e} />}
      {e && <StatusBar e={e} />}

      <input ref={fileRef} type="file" hidden accept="image/*,.forma,.json"
        onChange={async (ev) => {
          const f = ev.target.files?.[0];
          ev.target.value = '';
          if (f && e) { setDialog(null); await e.openFile(f, fileMode.current); }
        }} />

      {e && dialog === 'new' && <NewDocDialog e={e} onClose={() => setDialog(null)} onOpen={() => ui.open('open')} />}
      {e && dialog === 'export' && <ExportDialog e={e} onClose={() => setDialog(null)} />}
      {e && dialog === 'size' && <SizeDialog e={e} onClose={() => setDialog(null)} />}
      {dialog === 'shortcuts' && <ShortcutsDialog onClose={() => setDialog(null)} />}
      {e && dialog === 'palette' && <CommandPalette onClose={() => setDialog(null)} run={(c) => { setDialog(null); setTimeout(() => run(c)); }} setTool={(t) => { setDialog(null); if (e!.hasDoc) e!.setTool(t); }} />}
    </div>
  );
}

// ───────────────────────── barra superior ─────────────────────────
function TopBar({ e, run, ui }: { e: FormaEngine; run: (c: Command) => void; ui: UiApi }) {
  const [open, setOpen] = useState<MenuId | null>(null);
  useEffect(() => {
    if (!open) return;
    const off = (ev: PointerEvent) => { if (!(ev.target as HTMLElement).closest('.menubar')) setOpen(null); };
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [open]);
  return (
    <header className="topbar">
      <button className="brand" onClick={ui.goHome} aria-label="Voltar ao site"><Logo size={26} /></button>
      <nav className="menubar">
        {MENUS.map((m) => (
          <div key={m.id} className={`menu ${open === m.id ? 'open' : ''}`}>
            <button className="menu-btn" onClick={() => setOpen(open === m.id ? null : m.id)} onPointerEnter={() => open && setOpen(m.id)}>{m.label}</button>
            {open === m.id && (
              <div className="menu-pop">
                {COMMANDS.filter((c) => c.menu === m.id && !c.hidden).map((c) => (
                  <div key={c.id}>
                    {c.sepBefore && <div className="menu-sep" />}
                    <button className="menu-item" onClick={() => { setOpen(null); run(c); }}>
                      <span>{c.label}</span>
                      <kbd>{formatKeys(c.keys)}</kbd>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="docname">
        {e.hasDoc && <><span className="dot" />{e.doc.name}<span className="muted"> · {e.doc.width}×{e.doc.height}</span></>}
      </div>
      <div className="topbar-right">
        <IconBtn tip="Desfazer (Ctrl+Z)" onClick={() => e.undo()} disabled={e.historyIndex <= 0}><Undo2 size={16} /></IconBtn>
        <IconBtn tip="Refazer (Ctrl+Shift+Z)" onClick={() => e.redo()} disabled={e.historyIndex >= e.history.length - 1}><Redo2 size={16} /></IconBtn>
        <button className="palette-btn" onClick={() => ui.dialog('palette')}>
          <Search size={14} /><span>Buscar comando</span><kbd>{formatKeys('mod+k')}</kbd>
        </button>
        <IconBtn tip="Painéis (Tab)" onClick={() => ui.togglePanel('right')}><PanelRight size={16} /></IconBtn>
        <button className="btn lime sm" onClick={() => (e.hasDoc ? ui.dialog('export') : ui.dialog('new'))}><Download size={14} />Exportar</button>
      </div>
    </header>
  );
}

// ───────────────────────── barra de opções da ferramenta ─────────────────────────
function OptionsBar({ e, hint }: { e: FormaEngine; hint: string }) {
  const t = e.tool;
  return (
    <div className="optionsbar">
      <span className="opt-tool"><ToolIcon name={TOOLS.find((x) => x.id === t)!.icon} size={15} />{TOOLS.find((x) => x.id === t)!.label}</span>
      <span className="vsep" />
      {(t === 'brush' || t === 'eraser') && (
        <>
          <div className="opt"><Slider label="Tamanho" value={e.brush.size} min={1} max={400} step={1} format={(v) => `${v}px`} onChange={(v) => e.setBrush({ size: v })} /></div>
          <div className="opt"><Slider label="Dureza" value={e.brush.hardness} min={0} max={1} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => e.setBrush({ hardness: v })} /></div>
          {t === 'brush' && <div className="opt"><Slider label="Opacidade" value={e.brush.opacity} min={0.05} max={1} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => e.setBrush({ opacity: v })} /></div>}
        </>
      )}
      {(t === 'rect' || t === 'ellipse') && (
        <>
          <label className="check"><input type="checkbox" checked={e.shape.fill} onChange={(ev) => { e.shape.fill = ev.target.checked; e.emit(); }} />Preencher</label>
          <label className="check"><input type="checkbox" checked={e.shape.stroke} onChange={(ev) => { e.shape.stroke = ev.target.checked; e.emit(); }} />Contorno</label>
          <NumField label="Esp." value={e.shape.strokeWidth} min={1} width={84} onCommit={(v) => { e.shape.strokeWidth = v; e.emit(); }} />
          {t === 'rect' && <NumField label="Raio" value={e.shape.radius} min={0} width={84} onCommit={(v) => { e.shape.radius = v; e.emit(); }} />}
        </>
      )}
      {t === 'line' && <NumField label="Espessura" value={e.shape.strokeWidth} min={1} width={110} onCommit={(v) => { e.shape.strokeWidth = v; e.emit(); }} />}
      {t === 'text' && (
        <>
          <Select value={e.text.font} width={150} options={['Inter', 'Space Grotesk', 'Montserrat', 'Poppins', 'Playfair Display', 'DM Serif Display', 'Bebas Neue', 'Caveat', 'JetBrains Mono', 'Georgia', 'Arial', 'Impact'].map((f) => ({ id: f, label: f }))} onChange={(v) => { e.text.font = v; e.emit(); }} />
          <Select value={e.text.weight} width={110} options={[{ id: '400', label: 'Regular' }, { id: '600', label: 'Semibold' }, { id: '700', label: 'Bold' }, { id: '800', label: 'Extrabold' }]} onChange={(v) => { e.text.weight = v; e.emit(); }} />
          <NumField label="T" value={e.text.size} min={4} width={90} suffix="px" onCommit={(v) => { e.text.size = v; e.emit(); }} />
        </>
      )}
      {(t === 'move' || t === 'zoom' || t === 'hand') && (
        <div className="row gap4">
          <button className="btn ghost sm" onClick={() => e.fit()}>Ajustar à tela</button>
          <button className="btn ghost sm" onClick={() => e.actualSize()}>100%</button>
        </div>
      )}
      <span className="opt-hint">{hint}</span>
    </div>
  );
}

// ───────────────────────── barra de ferramentas ─────────────────────────
const TOOL_GROUPS: ToolId[][] = [['move', 'marquee', 'crop', 'eyedropper'], ['brush', 'eraser', 'gradient', 'bucket'], ['text', 'rect', 'ellipse', 'line'], ['hand', 'zoom']];

function ToolBar({ e, bank, onBank }: { e: FormaEngine; bank: boolean; onBank: () => void }) {
  return (
    <aside className="toolbar card">
      {TOOL_GROUPS.map((g, gi) => (
        <div className="toolgroup" key={gi}>
          {g.map((id) => {
            const t = TOOLS.find((x) => x.id === id)!;
            return (
              <button key={id} className={`tool ${e.tool === id ? 'on' : ''}`} data-tip={`${t.label} (${t.key.toUpperCase()})`} data-tip-side="right" aria-label={t.label}
                onClick={() => e.hasDoc && e.setTool(id)}>
                <ToolIcon name={t.icon} size={18} />
              </button>
            );
          })}
        </div>
      ))}
      <div className="toolgroup">
        <button className={`tool ${bank ? 'on' : ''}`} data-tip="Banco de imagens" data-tip-side="right" aria-label="Banco de imagens" onClick={onBank}>
          <Images size={18} strokeWidth={1.6} />
        </button>
      </div>
      <div className="toolcolors">
        <button className="tc-bg" style={{ background: e.bg }} onClick={() => e.swapColors()} aria-label="Cor de fundo" data-tip="Fundo — X troca" data-tip-side="right" />
        <button className="tc-fg" style={{ background: e.fg }} aria-label="Cor de frente" data-tip="Frente" data-tip-side="right">
          <input type="color" value={e.fg} onChange={(ev) => e.setColors(ev.target.value)} />
        </button>
      </div>
    </aside>
  );
}

// ───────────────────────── barra de status ─────────────────────────
function StatusBar({ e }: { e: FormaEngine }) {
  const [z, setZ] = useState<string | null>(null);
  const act = e.active();
  return (
    <footer className="statusbar">
      <div className="zoomctl">
        <button onClick={() => e.zoomOut()} aria-label="Afastar"><Minus size={13} /></button>
        <input value={z ?? `${Math.round(e.zoom * 100)}%`} onFocus={(ev) => { setZ(String(Math.round(e.zoom * 100))); setTimeout(() => ev.target.select()); }}
          onChange={(ev) => setZ(ev.target.value)}
          onBlur={() => { const v = parseFloat(z || ''); if (!isNaN(v)) e.zoomTo(v / 100); setZ(null); }}
          onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }} />
        <button onClick={() => e.zoomIn()} aria-label="Aproximar"><Plus size={13} /></button>
        <button onClick={() => e.fit()} aria-label="Ajustar à tela" data-tip="Ajustar (Ctrl+0)"><Maximize size={12} /></button>
      </div>
      <span className="muted">{e.hasDoc ? `${e.doc.width} × ${e.doc.height} px` : 'Nenhum documento'}</span>
      {e.cursor && <span className="muted mono">X {e.cursor.x} · Y {e.cursor.y}</span>}
      {act && <span className="muted">{(act as any).name || `${e.selectedLayers().length} camadas`}{act instanceof FabricImage ? ' · imagem' : ''}</span>}
      <span className="spacer" />
      <span className="muted">{e.layers().length} camada{e.layers().length === 1 ? '' : 's'}</span>
      <span className="muted">Salvo automaticamente</span>
    </footer>
  );
}

function Toast({ e }: { e: FormaEngine }) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!e.toast) return;
    setVis(true);
    const t = setTimeout(() => setVis(false), 2400);
    return () => clearTimeout(t);
  }, [e.toast?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={`toast ${vis ? 'show' : ''}`}>{e.toast?.msg}</div>;
}

// ───────────────────────── diálogos ─────────────────────────
const PRESETS: { name: string; w: number; h: number; icon: JSX.Element; group: string }[] = [
  { name: 'Post Instagram', w: 1080, h: 1350, icon: <Smartphone size={16} />, group: 'Social' },
  { name: 'Quadrado', w: 1080, h: 1080, icon: <Square size={16} />, group: 'Social' },
  { name: 'Story / Reels', w: 1080, h: 1920, icon: <Smartphone size={16} />, group: 'Social' },
  { name: 'Full HD', w: 1920, h: 1080, icon: <Monitor size={16} />, group: 'Tela' },
  { name: 'Apresentação', w: 1920, h: 1080, icon: <Presentation size={16} />, group: 'Tela' },
  { name: 'Thumbnail YouTube', w: 1280, h: 720, icon: <Monitor size={16} />, group: 'Tela' },
  { name: 'A4 (150 dpi)', w: 1240, h: 1754, icon: <FileImage size={16} />, group: 'Impressão' },
  { name: 'Cartão de visita', w: 1050, h: 600, icon: <FileImage size={16} />, group: 'Impressão' },
];

function NewDocDialog({ e, onClose, onOpen }: { e: FormaEngine; onClose: () => void; onOpen: () => void }) {
  const [sel, setSel] = useState(0);
  const [w, setW] = useState(PRESETS[0].w);
  const [h, setH] = useState(PRESETS[0].h);
  const [name, setName] = useState('Sem título');
  const [bg, setBg] = useState<'white' | 'black' | 'transparent'>('white');
  const saved = useMemo(() => FormaEngine.savedProject(), []);
  const create = (d?: Partial<Doc>) => {
    e.newDocument(d || { name, width: w, height: h, background: bg === 'white' ? '#ffffff' : bg === 'black' ? '#000000' : null });
    e.setTool('move');
    onClose();
  };
  const close = () => { if (!e.hasDoc) create({ name: 'Sem título', width: 1920, height: 1080, background: '#ffffff' }); else onClose(); };
  return (
    <Modal title="Começar" onClose={close} width={760}>
      <div className="newdoc">
        <div className="newdoc-left">
          <button className="bigaction" onClick={onOpen}><FolderOpen size={18} /><span><b>Abrir imagem ou projeto</b><small>JPG, PNG, WEBP, .forma — ou arraste para a tela</small></span></button>
          {saved && saved.objects?.length > 0 && (
            <button className="bigaction" onClick={async () => { await e.loadProject(saved); onClose(); }}>
              <Clock size={18} /><span><b>Continuar “{saved.doc.name}”</b><small>{saved.doc.width}×{saved.doc.height} · {saved.objects.length} camadas · {new Date(saved.savedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></span>
            </button>
          )}
          <div className="presets">
            {PRESETS.map((p, i) => (
              <button key={p.name} className={`preset ${sel === i ? 'on' : ''}`} onClick={() => { setSel(i); setW(p.w); setH(p.h); }}>
                <span className="preset-shape" style={{ aspectRatio: `${p.w}/${p.h}` }} />
                <span className="preset-name">{p.name}</span>
                <span className="preset-size">{p.w}×{p.h}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="newdoc-right">
          <label className="lbl">Nome</label>
          <input className="textin" value={name} onChange={(ev) => setName(ev.target.value)} onKeyDown={(ev) => ev.stopPropagation()} />
          <div className="grid2" style={{ marginTop: 12 }}>
            <NumField label="L" value={w} min={1} max={10000} suffix="px" onCommit={(v) => { setW(v); setSel(-1); }} />
            <NumField label="A" value={h} min={1} max={10000} suffix="px" onCommit={(v) => { setH(v); setSel(-1); }} />
          </div>
          <label className="lbl" style={{ marginTop: 14 }}>Fundo</label>
          <div className="bgchoice">
            {(['white', 'black', 'transparent'] as const).map((b) => (
              <button key={b} className={bg === b ? 'on' : ''} onClick={() => setBg(b)}>
                <span className={`bgsw ${b}`} />{b === 'white' ? 'Branco' : b === 'black' ? 'Preto' : 'Transparente'}
              </button>
            ))}
          </div>
          <button className="btn primary block" style={{ marginTop: 18 }} onClick={() => create()}><FilePlus size={15} />Criar documento</button>
        </div>
      </div>
    </Modal>
  );
}

function ExportDialog({ e, onClose }: { e: FormaEngine; onClose: () => void }) {
  const [fmt, setFmt] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [q, setQ] = useState(0.92);
  const [scale, setScale] = useState(1);
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setPreview(e.exportDataURL('png', 1, Math.min(1, 520 / Math.max(e.doc.width, e.doc.height)))), 30);
    return () => clearTimeout(t);
  }, [e]);
  const go = () => {
    const url = e.exportDataURL(fmt, q, scale);
    download(url, `${slug(e.doc.name)}${scale !== 1 ? `@${scale}x` : ''}.${fmt === 'jpeg' ? 'jpg' : fmt}`);
    e.notify('Imagem exportada');
    onClose();
  };
  const bytes = Math.round(e.doc.width * e.doc.height * scale * scale * (fmt === 'png' ? 1.6 : fmt === 'jpeg' ? 0.35 * q : 0.25 * q));
  return (
    <Modal title="Exportar como" onClose={onClose} width={720}
      footer={<><span className="muted small">≈ {bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`} · {Math.round(e.doc.width * scale)}×{Math.round(e.doc.height * scale)} px</span><span className="spacer" /><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn lime" onClick={go}><Download size={15} />Exportar</button></>}>
      <div className="export">
        <div className={`export-prev ${!e.doc.background ? 'checker' : ''}`}>{preview && <img src={preview} alt="Prévia" />}</div>
        <div className="export-opts">
          <label className="lbl">Formato</label>
          <div className="seg">
            {(['png', 'jpeg', 'webp'] as const).map((f) => <button key={f} className={fmt === f ? 'on' : ''} onClick={() => setFmt(f)}>{f === 'jpeg' ? 'JPG' : f.toUpperCase()}</button>)}
          </div>
          {fmt !== 'png' && <Slider label="Qualidade" value={q} min={0.4} max={1} format={(v) => `${Math.round(v * 100)}%`} onChange={setQ} />}
          <label className="lbl" style={{ marginTop: 12 }}>Escala</label>
          <div className="seg">
            {[0.5, 1, 2, 3].map((s) => <button key={s} className={scale === s ? 'on' : ''} onClick={() => setScale(s)}>{s}x</button>)}
          </div>
          {fmt === 'jpeg' && !e.doc.background && <p className="muted small" style={{ marginTop: 10 }}>JPG não tem transparência: o fundo sai branco.</p>}
        </div>
      </div>
    </Modal>
  );
}

function SizeDialog({ e, onClose }: { e: FormaEngine; onClose: () => void }) {
  const [w, setW] = useState(e.doc.width);
  const [h, setH] = useState(e.doc.height);
  const [lock, setLock] = useState(true);
  const [mode, setMode] = useState<'image' | 'canvas'>('image');
  const ratio = e.doc.width / e.doc.height;
  return (
    <Modal title="Tamanho do documento" onClose={onClose} width={420}
      footer={<><span className="spacer" /><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={() => { e.setDocSize(w, h, true, mode === 'image', 'center'); onClose(); }}>Aplicar</button></>}>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={mode === 'image' ? 'on' : ''} onClick={() => setMode('image')}>Redimensionar imagem</button>
        <button className={mode === 'canvas' ? 'on' : ''} onClick={() => setMode('canvas')}>Tamanho da tela</button>
      </div>
      <div className="grid2">
        <NumField label="L" value={w} min={1} max={12000} suffix="px" onCommit={(v) => { setW(v); if (lock) setH(Math.round(v / ratio)); }} />
        <NumField label="A" value={h} min={1} max={12000} suffix="px" onCommit={(v) => { setH(v); if (lock) setW(Math.round(v * ratio)); }} />
      </div>
      <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={lock} onChange={(ev) => setLock(ev.target.checked)} />Manter proporção</label>
      <p className="muted small" style={{ marginTop: 10 }}>{mode === 'image' ? 'Todas as camadas são redimensionadas junto.' : 'As camadas mantêm o tamanho; a tela cresce ou corta a partir do centro.'}</p>
    </Modal>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const groups = MENUS.map((m) => ({ m, items: COMMANDS.filter((c) => c.menu === m.id && c.keys && !c.hidden) })).filter((g) => g.items.length);
  return (
    <Modal title="Atalhos de teclado" onClose={onClose} width={860}>
      <div className="shortcuts">
        <section>
          <h3>Ferramentas</h3>
          {TOOLS.map((t) => <div key={t.id} className="sc"><span><ToolIcon name={t.icon} size={14} />{t.label}</span><kbd>{t.key.toUpperCase()}</kbd></div>)}
          <div className="sc"><span>Mão temporária</span><kbd>Espaço</kbd></div>
          <div className="sc"><span>Tamanho do pincel</span><kbd>[ ]</kbd></div>
          <div className="sc"><span>Dureza do pincel</span><kbd>Shift+[ ]</kbd></div>
          <div className="sc"><span>Opacidade da camada</span><kbd>1 … 0</kbd></div>
          <div className="sc"><span>Mover 1px / 10px</span><kbd>Setas / Shift</kbd></div>
          <div className="sc"><span>Zoom com roda</span><kbd>Ctrl+Roda</kbd></div>
        </section>
        {groups.map(({ m, items }) => (
          <section key={m.id}>
            <h3>{m.label}</h3>
            {items.map((c) => <div key={c.id} className="sc"><span>{c.label}</span><kbd>{formatKeys(c.keys)}</kbd></div>)}
          </section>
        ))}
      </div>
    </Modal>
  );
}

function CommandPalette({ onClose, run, setTool }: { onClose: () => void; run: (c: Command) => void; setTool: (t: ToolId) => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  type Item = { key: string; label: string; group: string; keys: string; act: () => void; icon?: JSX.Element };
  const all: Item[] = useMemo(() => [
    ...TOOLS.map((t) => ({ key: `t-${t.id}`, label: `Ferramenta ${t.label}`, group: 'Ferramenta', keys: t.key.toUpperCase(), act: () => setTool(t.id), icon: <ToolIcon name={t.icon} size={14} /> })),
    ...COMMANDS.filter((c) => !c.hidden).map((c) => ({ key: c.id, label: c.label, group: MENUS.find((m) => m.id === c.menu)!.label, keys: formatKeys(c.keys), act: () => run(c), icon: <CommandIcon size={13} /> })),
  ], [run, setTool]);
  const list = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return all.slice(TOOLS.length, TOOLS.length + 12).concat(all.slice(0, 4));
    return all.filter((x) => norm(`${x.label} ${x.group}`).includes(n)).slice(0, 14);
  }, [q, all]);
  useEffect(() => setI(0), [q]);
  return (
    <div className="modal-back palette-back" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="palette">
        <div className="palette-in">
          <Search size={16} />
          <input autoFocus placeholder="O que você quer fazer?" value={q} onChange={(ev) => setQ(ev.target.value)}
            onKeyDown={(ev) => {
              ev.stopPropagation();
              if (ev.key === 'Escape') onClose();
              if (ev.key === 'ArrowDown') { ev.preventDefault(); setI((x) => Math.min(list.length - 1, x + 1)); }
              if (ev.key === 'ArrowUp') { ev.preventDefault(); setI((x) => Math.max(0, x - 1)); }
              if (ev.key === 'Enter' && list[i]) list[i].act();
            }} />
          <kbd>Esc</kbd>
        </div>
        <ul>
          {list.map((x, k) => (
            <li key={x.key} className={k === i ? 'on' : ''} onPointerEnter={() => setI(k)} onClick={() => x.act()}>
              <span className="pal-ico">{x.icon}</span>
              <span className="pal-label">{x.label}</span>
              <span className="pal-group">{x.group}</span>
              {x.keys && <kbd>{x.keys}</kbd>}
            </li>
          ))}
          {!list.length && <li className="empty-row">Nada encontrado para “{q}”</li>}
        </ul>
        <footer className="palette-foot"><Keyboard size={12} /> ↑↓ navegar · Enter executar</footer>
      </div>
    </div>
  );
}

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'forma';
}

