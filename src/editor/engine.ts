import {
  ActiveSelection,
  Canvas,
  Canvas2dFilterBackend,
  Ellipse,
  FabricImage,
  FabricObject,
  Gradient,
  Group,
  IText,
  Line,
  Pattern,
  PencilBrush,
  Point,
  Rect,
  Shadow,
  cache,
  Color,
  config,
  loadSVGFromString,
  FabricText,
  filters,
  setFilterBackend,
  util,
  type TPointerEventInfo,
  type TPointerEvent,
} from 'fabric';
import { LutFilter, TemperatureFilter, VignetteFilter } from './lut';
import { ensureFont } from './fonts';

// ───────────────────────────── configuração global do Fabric ─────────────────────────────
// Backend 2D: permite filtros próprios (LUT, vinheta, temperatura) e evita limite de textura WebGL.
setFilterBackend(new Canvas2dFilterBackend());
config.perfLimitSizeTotal = 16_000_000;
config.maxCacheSideLimit = 8192;
FabricObject.ownDefaults.originX = 'left';
FabricObject.ownDefaults.originY = 'top';
FabricObject.ownDefaults.transparentCorners = false;
FabricObject.ownDefaults.cornerColor = '#ffffff';
FabricObject.ownDefaults.cornerStrokeColor = '#7c5cff';
FabricObject.ownDefaults.borderColor = '#7c5cff';
FabricObject.ownDefaults.cornerSize = 9;
FabricObject.ownDefaults.cornerStyle = 'circle';
FabricObject.ownDefaults.borderScaleFactor = 1.5;
FabricObject.ownDefaults.padding = 0;
FabricObject.customProperties = ['id', 'name', 'locked', 'kind', 'adjust', 'tint'];

// ───────────────────────────── tipos ─────────────────────────────
export type ToolId =
  | 'move' | 'marquee' | 'crop' | 'eyedropper' | 'brush' | 'eraser' | 'gradient'
  | 'bucket' | 'text' | 'rect' | 'ellipse' | 'line' | 'hand' | 'zoom';

export type LayerKind = 'image' | 'text' | 'shape' | 'paint' | 'group' | 'element';

export type Adjust = {
  brightness: number; contrast: number; saturation: number; vibrance: number; hue: number;
  exposure: number; temperature: number; blur: number; noise: number; pixelate: number;
  sharpen: number; vignette: number; grayscale: boolean; sepia: boolean; invert: boolean;
  lut: string; lutAmount: number;
};

export const DEFAULT_ADJUST: Adjust = {
  brightness: 0, contrast: 0, saturation: 0, vibrance: 0, hue: 0, exposure: 0, temperature: 0,
  blur: 0, noise: 0, pixelate: 0, sharpen: 0, vignette: 0, grayscale: false, sepia: false,
  invert: false, lut: '', lutAmount: 1,
};

export type Doc = { name: string; width: number; height: number; background: string | null };

export type LayerInfo = {
  id: string; name: string; kind: LayerKind; visible: boolean; locked: boolean;
  opacity: number; blend: string; selected: boolean;
};

export type HistoryEntry = { label: string; doc: Doc; objects: any[] };

type Lay = FabricObject & {
  id?: string; name?: string; locked?: boolean; kind?: LayerKind; adjust?: Adjust; isHelper?: boolean;
};

export const BLEND_MODES: { id: string; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Multiplicar' },
  { id: 'screen', label: 'Tela' },
  { id: 'overlay', label: 'Sobrepor' },
  { id: 'darken', label: 'Escurecer' },
  { id: 'lighten', label: 'Clarear' },
  { id: 'color-dodge', label: 'Subexposição de cor' },
  { id: 'color-burn', label: 'Superexposição de cor' },
  { id: 'hard-light', label: 'Luz direta' },
  { id: 'soft-light', label: 'Luz suave' },
  { id: 'difference', label: 'Diferença' },
  { id: 'exclusion', label: 'Exclusão' },
  { id: 'hue', label: 'Matiz' },
  { id: 'saturation', label: 'Saturação' },
  { id: 'color', label: 'Cor' },
  { id: 'luminosity', label: 'Luminosidade' },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const AUTOSAVE_KEY = 'forma.autosave.v1';
const HISTORY_LIMIT = 60;

function checker(): Pattern {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#e4e4ec'; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
  return new Pattern({ source: c, repeat: 'repeat' });
}

export function hexToRgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ───────────────────────────── motor ─────────────────────────────
export class FormaEngine {
  canvas: Canvas;
  host: HTMLElement;
  doc: Doc = { name: 'Sem título', width: 1920, height: 1080, background: '#ffffff' };
  hasDoc = false;
  tool: ToolId = 'move';
  fg = '#7c5cff';
  bg = '#ffffff';
  brush = { size: 24, hardness: 0.8, opacity: 1 };
  shape = { fill: true, stroke: false, strokeWidth: 4, radius: 0 };
  text = { font: 'Inter', size: 96, weight: '700' };
  history: HistoryEntry[] = [];
  historyIndex = -1;
  version = 0;
  cursor: { x: number; y: number } | null = null;
  marquee: Rect | null = null;
  cropRect: Rect | null = null;
  toast: { msg: string; at: number } | null = null;

  private artboard: Rect;
  private listeners = new Set<() => void>();
  private restoring = false;
  private exporting = false;
  private spaceDown = false;
  private toolBeforeSpace: ToolId | null = null;
  private drag: { start: Point; obj?: FabricObject; lastVp?: Point } | null = null;
  private clipboard: FabricObject | null = null;
  private emitQueued = false;
  private autosaveTimer = 0;
  private pasteboard = '#14141c';
  private resizeObs: ResizeObserver;

  constructor(el: HTMLCanvasElement, host: HTMLElement) {
    this.host = host;
    this.canvas = new Canvas(el, {
      width: host.clientWidth,
      height: host.clientHeight,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: false,
      selectionColor: 'rgba(124,92,255,0.12)',
      selectionBorderColor: '#7c5cff',
      selectionLineWidth: 1,
      backgroundColor: '',
      enableRetinaScaling: true,
    });
    this.artboard = new Rect({
      left: 0, top: 0, width: this.doc.width, height: this.doc.height,
      selectable: false, evented: false, hoverCursor: 'default', fill: '#ffffff',
    }) as Rect;
    (this.artboard as Lay).isHelper = true;
    (this.artboard as any).excludeFromExport = false;
    this.canvas.add(this.artboard);

    this.pasteboard = getComputedStyle(host).getPropertyValue('--pasteboard').trim() || this.pasteboard;
    this.bindCanvasEvents();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(host);
  }

  // ───────── store ─────────
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  emit() {
    if (this.emitQueued) return;
    this.emitQueued = true;
    requestAnimationFrame(() => {
      this.emitQueued = false;
      this.version++;
      this.listeners.forEach((l) => l());
    });
  }
  notify(msg: string) {
    this.toast = { msg, at: Date.now() };
    this.emit();
  }

  destroy() {
    this.resizeObs.disconnect();
    this.canvas.dispose();
  }

  // ───────── camadas ─────────
  layers(): Lay[] {
    return this.canvas.getObjects().filter((o) => !(o as Lay).isHelper) as Lay[];
  }
  /** Camada ativa: a seleção do Fabric ou, fora da ferramenta Mover, a última camada escolhida. */
  active(): Lay | null {
    const a = this.canvas.getActiveObject() as Lay | undefined;
    if (a && !a.isHelper) return a;
    if (this.tool !== 'move' && this.activeLayerId) return this.layerById(this.activeLayerId);
    return null;
  }
  selectedLayers(): Lay[] {
    const sel = (this.canvas.getActiveObjects() as Lay[]).filter((o) => !o.isHelper);
    if (sel.length) return sel;
    const a = this.active();
    return a ? [a] : [];
  }
  private activeLayerId: string | null = null;
  /** Torna a camada ativa; só mostra as alças na ferramenta Mover. */
  focusLayer(o: Lay) {
    this.activeLayerId = o.id || null;
    if (this.tool === 'move') this.canvas.setActiveObject(o);
    else this.canvas.discardActiveObject();
  }
  layerById(id: string) {
    return this.layers().find((l) => l.id === id) || null;
  }
  layerInfo(): LayerInfo[] {
    const sel = new Set(this.selectedLayers().map((l) => l.id));
    return this.layers()
      .map((o) => ({
        id: o.id!, name: o.name || 'Camada', kind: o.kind || 'shape', visible: o.visible !== false,
        locked: !!o.locked, opacity: o.opacity ?? 1, blend: o.globalCompositeOperation || 'source-over',
        selected: sel.has(o.id!),
      }))
      .reverse();
  }

  private nextName(base: string) {
    const names = new Set(this.layers().map((l) => l.name));
    let i = 1;
    while (names.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  }

  private prep(o: Lay, kind: LayerKind, name?: string) {
    o.id = o.id || uid();
    o.kind = kind;
    o.name = name || o.name || this.nextName(kindLabel(kind));
    this.applyLock(o);
    return o;
  }

  private applyLock(o: Lay) {
    const lockable = !o.locked && this.tool !== 'crop';
    o.selectable = lockable;
    o.evented = lockable;
  }

  /** Insere acima da camada ativa (ou no topo). */
  addLayer(o: Lay, opts: { select?: boolean; above?: Lay | null } = {}) {
    const ref = opts.above === undefined ? this.active() : opts.above;
    const objs = this.canvas.getObjects();
    if (ref && !(ref instanceof ActiveSelection)) {
      const idx = objs.indexOf(ref);
      this.canvas.insertAt(idx + 1, o);
    } else {
      this.canvas.add(o);
    }
    this.helpersToFront();
    if (opts.select !== false) this.focusLayer(o);
    this.canvas.requestRenderAll();
  }

  private helpersToFront() {
    if (this.marquee) this.canvas.bringObjectToFront(this.marquee);
    if (this.cropRect) this.canvas.bringObjectToFront(this.cropRect);
  }

  selectLayer(id: string, additive = false) {
    const o = this.layerById(id);
    if (!o) return;
    if (additive) {
      const cur = this.selectedLayers();
      const next = cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o];
      this.canvas.discardActiveObject();
      if (next.length === 1) this.canvas.setActiveObject(next[0]);
      else if (next.length > 1) this.canvas.setActiveObject(new ActiveSelection(next, { canvas: this.canvas }));
    } else {
      this.canvas.discardActiveObject();
      this.canvas.setActiveObject(o);
    }
    this.canvas.requestRenderAll();
    this.emit();
  }

  setLayerProp(id: string, props: Partial<{ visible: boolean; locked: boolean; name: string; opacity: number; blend: string }>, commit = true) {
    const o = this.layerById(id);
    if (!o) return;
    if (props.visible !== undefined) {
      o.visible = props.visible;
      if (!props.visible && this.selectedLayers().includes(o)) this.canvas.discardActiveObject();
    }
    if (props.locked !== undefined) {
      o.locked = props.locked;
      this.applyLock(o);
      if (props.locked && this.selectedLayers().includes(o)) this.canvas.discardActiveObject();
    }
    if (props.name !== undefined) o.name = props.name.trim() || o.name;
    if (props.opacity !== undefined) o.opacity = props.opacity;
    if (props.blend !== undefined) o.globalCompositeOperation = props.blend as any;
    o.dirty = true;
    this.canvas.requestRenderAll();
    if (commit) {
      const label = props.visible !== undefined ? 'Visibilidade' : props.locked !== undefined ? 'Bloqueio'
        : props.name !== undefined ? 'Renomear camada' : props.blend !== undefined ? 'Modo de mesclagem' : 'Opacidade';
      this.commit(label);
    } else this.emit();
  }

  /** Move camada para a posição (índice na lista exibida, 0 = topo). */
  moveLayer(id: string, displayIndex: number) {
    const o = this.layerById(id);
    if (!o) return;
    const ls = this.layers();
    const target = ls.length - 1 - displayIndex;
    const objs = this.canvas.getObjects();
    const targetObj = ls[Math.max(0, Math.min(ls.length - 1, target))];
    this.canvas.moveObjectTo(o, objs.indexOf(targetObj));
    this.helpersToFront();
    this.canvas.requestRenderAll();
    this.commit('Reordenar camadas');
  }

  arrange(dir: 'up' | 'down' | 'top' | 'bottom') {
    const o = this.active();
    if (!o) return;
    if (dir === 'up') this.canvas.bringObjectForward(o);
    if (dir === 'down') {
      const objs = this.canvas.getObjects();
      if (objs.indexOf(o) > 1) this.canvas.sendObjectBackwards(o);
    }
    if (dir === 'top') this.canvas.bringObjectToFront(o);
    if (dir === 'bottom') this.canvas.moveObjectTo(o, 1);
    this.helpersToFront();
    this.canvas.requestRenderAll();
    this.commit('Organizar');
  }

  newPaintLayer() {
    const g = new Group([], { interactive: false, subTargetCheck: false }) as Lay;
    this.prep(g, 'paint');
    this.addLayer(g);
    this.commit('Nova camada');
    return g;
  }

  deleteSelected() {
    if (this.marquee && this.active()) return this.clearInsideSelection();
    const sel = this.selectedLayers();
    if (!sel.length) return;
    this.canvas.discardActiveObject();
    sel.forEach((o) => this.canvas.remove(o));
    this.canvas.requestRenderAll();
    this.commit(sel.length > 1 ? 'Excluir camadas' : 'Excluir camada');
  }

  async duplicateSelected() {
    if (this.marquee) return this.copySelectionToLayer();
    const sel = this.selectedLayers();
    if (!sel.length) return;
    const clones: Lay[] = [];
    for (const o of sel) {
      const c = (await o.clone()) as Lay;
      c.id = uid();
      c.name = `${o.name} cópia`;
      this.applyLock(c);
      const idx = this.canvas.getObjects().indexOf(o);
      this.canvas.insertAt(idx + 1, c);
      clones.push(c);
    }
    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(clones.length > 1 ? new ActiveSelection(clones, { canvas: this.canvas }) : clones[0]);
    this.helpersToFront();
    this.canvas.requestRenderAll();
    this.commit('Duplicar camada');
  }

  groupSelected() {
    const sel = this.selectedLayers();
    if (sel.length < 2) return this.notify('Selecione duas ou mais camadas para agrupar');
    const objs = this.canvas.getObjects();
    const top = Math.max(...sel.map((o) => objs.indexOf(o)));
    this.canvas.discardActiveObject();
    const ordered = [...sel].sort((a, b) => objs.indexOf(a) - objs.indexOf(b));
    ordered.forEach((o) => this.canvas.remove(o));
    const g = new Group(ordered, { interactive: false }) as Lay;
    this.prep(g, 'group', this.nextName('Grupo'));
    this.canvas.insertAt(Math.min(top - ordered.length + 1, this.canvas.getObjects().length), g);
    this.helpersToFront();
    this.canvas.setActiveObject(g);
    this.canvas.requestRenderAll();
    this.commit('Agrupar');
  }

  ungroupSelected() {
    const g = this.active();
    if (!(g instanceof Group) || g instanceof ActiveSelection) return;
    const idx = this.canvas.getObjects().indexOf(g);
    const items = g.removeAll() as Lay[];
    this.canvas.remove(g);
    items.forEach((o, i) => {
      if (!o.id) this.prep(o, o instanceof IText ? 'text' : o instanceof FabricImage ? 'image' : 'shape');
      this.applyLock(o);
      this.canvas.insertAt(idx + i, o);
    });
    this.canvas.setActiveObject(new ActiveSelection(items, { canvas: this.canvas }));
    this.helpersToFront();
    this.canvas.requestRenderAll();
    this.commit('Desagrupar');
  }

  // ───────── rasterização / mescla ─────────
  private renderObjects(objs: FabricObject[], bounds?: { left: number; top: number; width: number; height: number }) {
    const b = bounds || this.unionBounds(objs);
    const vpt = this.canvas.viewportTransform.slice() as any;
    const helpersVisible = this.helpersVisible(false);
    this.exporting = true;
    this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    const set = new Set(objs);
    const el = this.canvas.toCanvasElement(1, {
      left: b.left, top: b.top, width: Math.max(1, b.width), height: Math.max(1, b.height),
      filter: (o: any) => set.has(o),
    });
    this.canvas.viewportTransform = vpt;
    this.exporting = false;
    this.helpersVisible(helpersVisible);
    return { el, bounds: b };
  }

  private unionBounds(objs: FabricObject[]) {
    let l = Infinity, t = Infinity, r = -Infinity, bt = -Infinity;
    objs.forEach((o) => {
      const br = o.getBoundingRect();
      l = Math.min(l, br.left); t = Math.min(t, br.top);
      r = Math.max(r, br.left + br.width); bt = Math.max(bt, br.top + br.height);
    });
    l = Math.floor(l); t = Math.floor(t);
    return { left: l, top: t, width: Math.ceil(r - l), height: Math.ceil(bt - t) };
  }

  private helpersVisible(v: boolean) {
    const prev = !!(this.marquee?.visible || this.cropRect?.visible);
    if (this.marquee) this.marquee.visible = v;
    if (this.cropRect) this.cropRect.visible = v;
    return prev;
  }

  private async imageFromCanvas(el: HTMLCanvasElement, left: number, top: number) {
    const img = (await FabricImage.fromURL(el.toDataURL('image/png'))) as Lay;
    img.set({ left, top });
    return img;
  }

  async rasterize(o?: Lay | null) {
    o = o || this.active();
    if (!o || o instanceof ActiveSelection) return null;
    const blend = o.globalCompositeOperation, opacity = o.opacity, vis = o.visible;
    o.set({ globalCompositeOperation: 'source-over', opacity: 1, visible: true });
    const { el, bounds } = this.renderObjects([o]);
    const img = await this.imageFromCanvas(el, bounds.left, bounds.top);
    img.set({ globalCompositeOperation: blend, opacity, visible: vis });
    img.id = o.id; img.name = o.name;
    this.prep(img, 'image', o.name);
    const idx = this.canvas.getObjects().indexOf(o);
    this.canvas.remove(o);
    this.canvas.insertAt(idx, img);
    this.canvas.setActiveObject(img);
    this.canvas.requestRenderAll();
    this.commit('Rasterizar camada');
    return img;
  }

  async mergeDown() {
    const o = this.active();
    if (!o || o instanceof ActiveSelection) return this.mergeSelected();
    const ls = this.layers();
    const i = ls.indexOf(o);
    if (i <= 0) return this.notify('Não há camada abaixo para mesclar');
    await this.mergeLayers([ls[i - 1], o], ls[i - 1].name || 'Mesclada');
  }

  async mergeSelected() {
    const sel = this.selectedLayers();
    if (sel.length < 2) return this.notify('Selecione duas ou mais camadas');
    await this.mergeLayers(sel, 'Mesclada');
  }

  async mergeVisible() {
    const vis = this.layers().filter((l) => l.visible !== false);
    if (vis.length < 2) return this.notify('É preciso ter duas camadas visíveis');
    await this.mergeLayers(vis, 'Visível mesclada');
  }

  async flatten() {
    const ls = this.layers();
    if (!ls.length) return;
    this.canvas.discardActiveObject();
    const objs = [this.artboard, ...ls.filter((l) => l.visible !== false)];
    const { el } = this.renderObjects(objs, { left: 0, top: 0, width: this.doc.width, height: this.doc.height });
    const img = await this.imageFromCanvas(el, 0, 0);
    ls.forEach((l) => this.canvas.remove(l));
    this.prep(img, 'image', 'Fundo');
    this.canvas.add(img);
    this.helpersToFront();
    this.canvas.requestRenderAll();
    this.commit('Achatar imagem');
  }

  private async mergeLayers(list: Lay[], name: string) {
    const objs = this.canvas.getObjects();
    const ordered = [...list].sort((a, b) => objs.indexOf(a) - objs.indexOf(b));
    this.canvas.discardActiveObject();
    const { el, bounds } = this.renderObjects(ordered);
    const img = await this.imageFromCanvas(el, bounds.left, bounds.top);
    const idx = objs.indexOf(ordered[0]);
    ordered.forEach((o) => this.canvas.remove(o));
    this.prep(img, 'image', name);
    this.canvas.insertAt(idx, img);
    this.helpersToFront();
    this.canvas.setActiveObject(img);
    this.canvas.requestRenderAll();
    this.commit('Mesclar camadas');
  }

  /** Garante que a camada aceite pintura/borracha (vira grupo de pintura). */
  private ensurePaintTarget(o: Lay): Group & Lay {
    if (o instanceof Group && (o as Lay).kind === 'paint') return o as Group & Lay;
    const idx = this.canvas.getObjects().indexOf(o);
    const { opacity, globalCompositeOperation: blend, id, name, visible } = o;
    this.canvas.discardActiveObject();
    this.canvas.remove(o);
    o.set({ opacity: 1, globalCompositeOperation: 'source-over' });
    const g = new Group([o], { interactive: false, opacity, globalCompositeOperation: blend, visible }) as Group & Lay;
    g.id = id; g.name = name;
    this.prep(g, 'paint', name);
    this.canvas.insertAt(idx, g);
    return g;
  }

  // ───────── seleção (letreiro) ─────────
  setMarquee(r: { left: number; top: number; width: number; height: number } | null) {
    if (this.marquee) this.canvas.remove(this.marquee);
    this.marquee = null;
    if (r && r.width > 1 && r.height > 1) {
      const m = new Rect({
        ...r, fill: 'rgba(124,92,255,0.06)', stroke: '#ffffff', strokeWidth: 1, strokeUniform: true,
        strokeDashArray: [5, 4], selectable: false, evented: false, objectCaching: false,
      }) as Rect & Lay;
      m.isHelper = true;
      this.marquee = m;
      this.canvas.add(m);
      this.marchAnts();
    }
    this.canvas.requestRenderAll();
    this.emit();
  }

  private antsRaf = 0;
  private marchAnts() {
    cancelAnimationFrame(this.antsRaf);
    let last = 0;
    const step = (t: number) => {
      if (!this.marquee) return;
      if (t - last > 60) {
        last = t;
        this.marquee.strokeDashOffset = ((this.marquee.strokeDashOffset || 0) - 1) % 9;
        this.canvas.requestRenderAll();
      }
      this.antsRaf = requestAnimationFrame(step);
    };
    this.antsRaf = requestAnimationFrame(step);
  }

  selectAll() {
    if (this.tool === 'marquee') return this.setMarquee({ left: 0, top: 0, width: this.doc.width, height: this.doc.height });
    const ls = this.layers().filter((l) => !l.locked && l.visible !== false);
    if (!ls.length) return;
    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(ls.length === 1 ? ls[0] : new ActiveSelection(ls, { canvas: this.canvas }));
    this.canvas.requestRenderAll();
    this.emit();
  }

  deselect() {
    this.activeLayerId = null;
    this.setMarquee(null);
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.emit();
  }

  private marqueeBounds() {
    const m = this.marquee!;
    return { left: Math.round(m.left), top: Math.round(m.top), width: Math.round(m.width * m.scaleX), height: Math.round(m.height * m.scaleY) };
  }

  fillSelection(color = this.fg) {
    const b = this.marquee ? this.marqueeBounds() : { left: 0, top: 0, width: this.doc.width, height: this.doc.height };
    const r = new Rect({ ...b, fill: color }) as Lay;
    this.prep(r, 'shape', this.nextName('Preenchimento'));
    this.addLayer(r);
    this.commit('Preencher');
  }

  async copySelectionToLayer() {
    if (!this.marquee) return;
    const b = this.marqueeBounds();
    const src = this.active() ? [this.active()!] : this.layers().filter((l) => l.visible !== false);
    if (!src.length) return;
    const { el } = this.renderObjects(src, b);
    const img = await this.imageFromCanvas(el, b.left, b.top);
    this.prep(img, 'image', 'Camada via cópia');
    this.addLayer(img);
    this.setMarquee(null);
    this.commit('Camada via cópia');
  }

  clearInsideSelection() {
    const o = this.active();
    if (!o || !this.marquee || o instanceof ActiveSelection) return;
    const g = this.ensurePaintTarget(o);
    const r = new Rect({ ...this.marqueeBounds(), fill: '#000', globalCompositeOperation: 'destination-out' });
    g.add(r);
    g.set('dirty', true);
    this.focusLayer(g);
    this.canvas.requestRenderAll();
    this.commit('Limpar seleção');
  }

  cropToSelection() {
    if (!this.marquee) return this.notify('Faça uma seleção com o Letreiro (M) primeiro');
    const b = this.marqueeBounds();
    this.setMarquee(null);
    this.applyCrop(b);
  }

  // ───────── corte ─────────
  private startCrop() {
    const c = new Rect({
      left: 0, top: 0, width: this.doc.width, height: this.doc.height, fill: 'rgba(0,0,0,0)',
      stroke: '#d4ff3a', strokeWidth: 1.5, strokeUniform: true, lockRotation: true, hasRotatingPoint: false,
      cornerColor: '#d4ff3a', cornerStrokeColor: '#0b0b12', borderColor: '#d4ff3a', objectCaching: false,
    }) as Rect & Lay;
    c.setControlsVisibility({ mtr: false });
    c.isHelper = true;
    this.cropRect = c;
    this.canvas.discardActiveObject();
    this.layers().forEach((l) => this.applyLock(l));
    this.canvas.add(c);
    this.canvas.setActiveObject(c);
    this.canvas.requestRenderAll();
  }

  private endCrop() {
    if (this.cropRect) this.canvas.remove(this.cropRect);
    this.cropRect = null;
    this.layers().forEach((l) => this.applyLock(l));
  }

  commitCrop() {
    if (!this.cropRect) return;
    const c = this.cropRect;
    const b = { left: Math.round(c.left), top: Math.round(c.top), width: Math.round(c.width * c.scaleX), height: Math.round(c.height * c.scaleY) };
    this.setTool('move');
    this.applyCrop(b);
  }

  cancelCrop() {
    this.setTool('move');
  }

  applyCrop(b: { left: number; top: number; width: number; height: number }) {
    if (b.width < 2 || b.height < 2) return;
    this.setMarquee(null);
    this.layers().forEach((o) => {
      o.set({ left: o.left - b.left, top: o.top - b.top });
      o.setCoords();
    });
    this.setDocSize(b.width, b.height, false);
    this.fit();
    this.commit('Cortar');
  }

  // ───────── documento ─────────
  setDocSize(w: number, h: number, commit = true, scaleContent = false, anchor: 'center' | 'topleft' = 'topleft') {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    if (scaleContent) {
      const sx = w / this.doc.width, sy = h / this.doc.height;
      this.layers().forEach((o) => util.addTransformToObject(o, [sx, 0, 0, sy, 0, 0]));
    } else if (anchor === 'center') {
      const dx = (w - this.doc.width) / 2, dy = (h - this.doc.height) / 2;
      this.layers().forEach((o) => o.set({ left: o.left + dx, top: o.top + dy }));
    }
    this.layers().forEach((o) => o.setCoords());
    this.doc = { ...this.doc, width: w, height: h };
    this.artboard.set({ width: w, height: h });
    this.artboard.setCoords();
    this.canvas.requestRenderAll();
    if (commit) {
      this.fit();
      this.commit(scaleContent ? 'Tamanho da imagem' : 'Tamanho da tela');
    }
    this.emit();
  }

  setBackground(color: string | null, commit = true) {
    this.doc = { ...this.doc, background: color };
    this.artboard.set('fill', color || checker());
    this.canvas.requestRenderAll();
    if (commit) this.commit('Cor de fundo');
    else this.emit();
  }

  transformCanvas(kind: 'rotCW' | 'rotCCW' | 'flipH' | 'flipV') {
    const { width: w, height: h } = this.doc;
    const m: [number, number, number, number, number, number] =
      kind === 'rotCW' ? [0, 1, -1, 0, h, 0]
        : kind === 'rotCCW' ? [0, -1, 1, 0, 0, w]
          : kind === 'flipH' ? [-1, 0, 0, 1, w, 0] : [1, 0, 0, -1, 0, h];
    this.canvas.discardActiveObject();
    this.layers().forEach((o) => { util.addTransformToObject(o, m); o.setCoords(); });
    if (kind === 'rotCW' || kind === 'rotCCW') this.setDocSize(h, w, false);
    this.fit();
    this.commit(kind.startsWith('rot') ? 'Girar tela' : 'Espelhar tela');
  }

  newDocument(d: Partial<Doc>) {
    this.endCrop();
    this.setMarquee(null);
    this.canvas.discardActiveObject();
    this.layers().forEach((l) => this.canvas.remove(l));
    this.doc = { name: d.name || 'Sem título', width: d.width || 1920, height: d.height || 1080, background: d.background === undefined ? '#ffffff' : d.background };
    this.artboard.set({ width: this.doc.width, height: this.doc.height, fill: this.doc.background || checker() });
    this.hasDoc = true;
    this.history = [];
    this.historyIndex = -1;
    this.fit();
    this.commit('Novo documento');
  }

  async openImage(src: string, name = 'Imagem') {
    const img = (await FabricImage.fromURL(src)) as Lay;
    const w = img.width, h = img.height;
    this.newDocument({ name, width: w, height: h, background: '#ffffff' });
    this.history = [];
    img.set({ left: 0, top: 0 });
    this.prep(img, 'image', 'Fundo');
    this.addLayer(img, { select: false });
    this.commit('Abrir');
  }

  async placeImage(src: string, name?: string, at?: Point) {
    if (!this.hasDoc) return this.openImage(src, name);
    const img = (await FabricImage.fromURL(src)) as Lay;
    const fit = Math.min(1, (this.doc.width * 0.9) / img.width, (this.doc.height * 0.9) / img.height);
    img.scale(fit);
    const cx = at ? at.x : this.doc.width / 2, cy = at ? at.y : this.doc.height / 2;
    img.set({ left: cx - (img.width * fit) / 2, top: cy - (img.height * fit) / 2 });
    this.prep(img, 'image', name || this.nextName('Imagem'));
    this.addLayer(img);
    this.setTool('move');
    this.commit('Colocar imagem');
  }

  /** Coloca uma imagem do banco (Pinterest ou livre). `client` = ponto da tela onde foi solto. */
  async placeRemote(url: string, name: string, client?: { x: number; y: number }) {
    const src = `/api/img?u=${encodeURIComponent(url)}`;
    let at: Point | undefined;
    if (client && this.hasDoc) {
      const r = this.canvas.upperCanvasEl.getBoundingClientRect();
      at = util.transformPoint(new Point(client.x - r.left, client.y - r.top), util.invertTransform(this.canvas.viewportTransform));
    }
    this.notify('Baixando imagem…');
    try {
      await this.placeImage(src, name.slice(0, 60), at);
      this.notify('Imagem adicionada como camada');
    } catch {
      this.notify('Não foi possível baixar essa imagem');
    }
  }

  // ───────── banco de elementos ─────────
  /**
   * Insere um SVG do banco. `currentColor` vira a cor de frente e as partes com essa cor
   * ficam marcadas (`tint`) para poderem ser recoloridas depois no painel Propriedades.
   */
  async addElement(svgText: string, name: string, opts: { client?: { x: number; y: number }; gradient?: { stops: string[]; angle: number } } = {}) {
    if (!this.hasDoc) this.newDocument({ name: 'Sem título', width: 1080, height: 1350, background: '#ffffff' });
    if (opts.gradient) return this.addGradient(name, opts.gradient);
    const MARK = '#fe01fe';
    const { objects, options } = await loadSVGFromString(svgText.replace(/currentColor/g, MARK));
    const isMark = (v: unknown) => typeof v === 'string' && v !== 'none' && new Color(v).toHex().toLowerCase() === 'fe01fe';
    const parts = (objects.filter(Boolean) as FabricObject[]).map((o) => {
      // texto de SVG vira texto editável
      if (o instanceof FabricText && !(o instanceof IText)) {
        const { type: _t, ...rest } = o.toObject() as Record<string, any>;
        const t = new IText(o.text, rest);
        t.set({ left: o.left, top: o.top, angle: o.angle });
        return t as FabricObject;
      }
      return o;
    });
    parts.forEach((o) => {
      const f = isMark(o.fill), st = isMark(o.stroke);
      if (f) o.set('fill', this.fg);
      if (st) o.set('stroke', this.fg);
      if (f || st) (o as any).tint = f && st ? 'both' : f ? 'fill' : 'stroke';
    });
    const obj = (parts.length === 1 ? parts[0] : util.groupSVGElements(parts, options)) as Lay;
    const target = Math.min(this.doc.width, this.doc.height) * 0.32;
    const k = target / Math.max(obj.width || 1, obj.height || 1);
    obj.scale(k);
    let at = new Point(this.doc.width / 2, this.doc.height / 2);
    if (opts.client) {
      const r = this.canvas.upperCanvasEl.getBoundingClientRect();
      at = util.transformPoint(new Point(opts.client.x - r.left, opts.client.y - r.top), util.invertTransform(this.canvas.viewportTransform));
    }
    obj.set({ left: at.x - obj.getScaledWidth() / 2, top: at.y - obj.getScaledHeight() / 2 });
    obj.setCoords();
    this.prep(obj, 'element', this.nextName(name));
    this.addLayer(obj);
    this.setTool('move');
    this.canvas.setActiveObject(obj);
    this.refreshAllText([obj]);
    this.commit('Elemento');
  }

  private addGradient(name: string, g: { stops: string[]; angle: number }) {
    const { width: w, height: h } = this.doc;
    const a = ((g.angle - 90) * Math.PI) / 180;
    const half = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h) / 2;
    const r = new Rect({
      left: 0, top: 0, width: w, height: h,
      fill: new Gradient({
        type: 'linear', gradientUnits: 'pixels',
        coords: { x1: w / 2 - Math.cos(a) * half, y1: h / 2 - Math.sin(a) * half, x2: w / 2 + Math.cos(a) * half, y2: h / 2 + Math.sin(a) * half },
        colorStops: g.stops.map((color, i) => ({ offset: i / (g.stops.length - 1), color })),
      }),
    }) as Lay;
    this.prep(r, 'shape', name);
    this.canvas.insertAt(1, r); // logo acima do fundo do documento
    this.helpersToFront();
    this.setTool('move');
    this.canvas.setActiveObject(r);
    this.canvas.requestRenderAll();
    this.commit('Gradiente');
  }

  /** Partes recoloríveis de um elemento (ou o próprio objeto). */
  tintParts(obj: FabricObject): FabricObject[] {
    const out: FabricObject[] = [];
    const walk = (o: FabricObject) => {
      if (o instanceof Group) o.getObjects().forEach(walk);
      else if ((o as any).tint) out.push(o);
    };
    walk(obj);
    return out;
  }

  elementColor(obj: FabricObject) {
    const p = this.tintParts(obj)[0] as any;
    if (!p) return null;
    const v = p.tint === 'stroke' ? p.stroke : p.fill;
    return typeof v === 'string' ? '#' + new Color(v).toHex().toLowerCase() : null;
  }

  setElementColor(obj: FabricObject, color: string, commit?: string) {
    this.tintParts(obj).forEach((o: any) => {
      if (o.tint === 'fill' || o.tint === 'both') o.set('fill', color);
      if (o.tint === 'stroke' || o.tint === 'both') o.set('stroke', color);
      o.set('dirty', true);
    });
    obj.set('dirty', true);
    this.canvas.requestRenderAll();
    if (commit) this.commit(commit); else this.emit();
  }

  elementStroke(obj: FabricObject) {
    const p = this.tintParts(obj).find((o: any) => o.tint !== 'fill');
    return p ? p.strokeWidth : null;
  }

  setElementStroke(obj: FabricObject, w: number, commit?: string) {
    this.tintParts(obj).forEach((o: any) => { if (o.tint !== 'fill') o.set({ strokeWidth: w, dirty: true }); });
    obj.set('dirty', true);
    this.canvas.requestRenderAll();
    if (commit) this.commit(commit); else this.emit();
  }

  async openFile(file: File, mode: 'open' | 'place' = 'open') {
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.forma') || lower.endsWith('.json')) {
      const txt = await file.text();
      return this.loadProject(JSON.parse(txt));
    }
    if (!file.type.startsWith('image/')) return this.notify('Formato não suportado');
    const url = await readFileAsDataURL(file);
    const name = file.name.replace(/\.[^.]+$/, '');
    if (mode === 'place' && this.hasDoc) return this.placeImage(url, name);
    return this.openImage(url, name);
  }

  // ───────── histórico ─────────
  private snapshot(label: string): HistoryEntry {
    return { label, doc: { ...this.doc }, objects: this.layers().map((o) => o.toObject()) };
  }

  commit(label: string) {
    if (this.restoring) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(this.snapshot(label));
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.scheduleAutosave();
    this.emit();
  }

  private async restore(entry: HistoryEntry) {
    this.restoring = true;
    const activeIds = new Set(this.selectedLayers().map((o) => o.id));
    this.canvas.discardActiveObject();
    this.layers().forEach((l) => this.canvas.remove(l));
    this.doc = { ...entry.doc };
    this.artboard.set({ width: this.doc.width, height: this.doc.height, fill: this.doc.background || checker() });
    const objs = (await util.enlivenObjects(entry.objects)) as Lay[];
    objs.forEach((o) => { this.applyLock(o); this.canvas.add(o); });
    this.refreshAllText(objs);
    this.helpersToFront();
    const again = objs.filter((o) => activeIds.has(o.id));
    if (again.length === 1) this.canvas.setActiveObject(again[0]);
    this.canvas.requestRenderAll();
    this.restoring = false;
    this.scheduleAutosave();
    this.emit();
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restore(this.history[this.historyIndex]);
  }
  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restore(this.history[this.historyIndex]);
  }
  gotoHistory(i: number) {
    if (i < 0 || i >= this.history.length || i === this.historyIndex) return;
    this.historyIndex = i;
    this.restore(this.history[i]);
  }

  // ───────── projeto ─────────
  projectJSON() {
    return { app: 'forma', version: 1, doc: this.doc, objects: this.layers().map((o) => o.toObject()) };
  }

  async loadProject(p: any) {
    if (!p || !p.doc || !Array.isArray(p.objects)) return this.notify('Arquivo de projeto inválido');
    this.newDocument(p.doc);
    this.history = [];
    await this.restore({ label: 'Abrir projeto', doc: p.doc, objects: p.objects });
    this.fit();
    this.commit('Abrir projeto');
  }

  private scheduleAutosave() {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...this.projectJSON(), savedAt: Date.now() }));
      } catch {
        /* projeto grande demais para o armazenamento local */
      }
    }, 1200);
  }

  static savedProject(): { doc: Doc; savedAt: number; objects: any[] } | null {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ───────── exportação ─────────
  exportDataURL(format: 'png' | 'jpeg' | 'webp', quality = 0.92, scale = 1) {
    const vpt = this.canvas.viewportTransform.slice() as any;
    const active = this.canvas.getActiveObject();
    this.canvas.discardActiveObject();
    const helpers = this.helpersVisible(false);
    const transparent = !this.doc.background;
    if (transparent && format !== 'jpeg') this.artboard.visible = false;
    if (transparent && format === 'jpeg') this.artboard.set('fill', '#ffffff');
    this.exporting = true;
    this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    const url = this.canvas.toDataURL({
      format, quality, multiplier: scale, left: 0, top: 0, width: this.doc.width, height: this.doc.height,
    });
    this.canvas.viewportTransform = vpt;
    this.exporting = false;
    this.artboard.visible = true;
    if (transparent) this.artboard.set('fill', checker());
    this.helpersVisible(helpers);
    if (active) this.canvas.setActiveObject(active);
    this.canvas.requestRenderAll();
    return url;
  }

  // ───────── viewport ─────────
  get zoom() {
    return this.canvas.getZoom();
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    const first = this.canvas.width === 0 || !this.hasFitted;
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    this.canvas.setDimensions({ width: w, height: h });
    if (first) this.fit();
    else this.canvas.relativePan(new Point(w / 2 - cx, h / 2 - cy));
    this.emit();
  }

  private hasFitted = false;
  fit() {
    const W = this.canvas.width, H = this.canvas.height;
    const pad = Math.min(80, Math.min(W, H) * 0.08);
    const z = Math.max(0.02, Math.min((W - pad * 2) / this.doc.width, (H - pad * 2) / this.doc.height, 8));
    this.canvas.setViewportTransform([z, 0, 0, z, (W - this.doc.width * z) / 2, (H - this.doc.height * z) / 2]);
    this.hasFitted = true;
    this.updateBrush();
    this.emit();
  }

  zoomTo(z: number, at?: Point) {
    z = Math.min(32, Math.max(0.02, z));
    const p = at || new Point(this.canvas.width / 2, this.canvas.height / 2);
    this.canvas.zoomToPoint(p, z);
    this.updateBrush();
    this.emit();
  }
  zoomIn() { this.zoomTo(this.zoom * 1.25); }
  zoomOut() { this.zoomTo(this.zoom / 1.25); }
  actualSize() {
    this.fit();
    this.zoomTo(1);
  }

  // ───────── ferramentas ─────────
  setTool(t: ToolId) {
    if (this.tool === 'crop' && t !== 'crop') this.endCrop();
    this.tool = t;
    const c = this.canvas;
    c.isDrawingMode = t === 'brush' || t === 'eraser';
    c.selection = t === 'move';
    c.skipTargetFind = !(t === 'move' || t === 'text' || t === 'bucket' || t === 'crop');
    const cursors: Partial<Record<ToolId, string>> = {
      hand: 'grab', zoom: 'zoom-in', eyedropper: 'crosshair', marquee: 'crosshair', rect: 'crosshair',
      ellipse: 'crosshair', line: 'crosshair', gradient: 'crosshair', text: 'text', bucket: 'cell', crop: 'default',
    };
    c.defaultCursor = cursors[t] || 'default';
    c.hoverCursor = t === 'move' ? 'move' : c.defaultCursor;
    if (t !== 'move') {
      const a = c.getActiveObject() as Lay | undefined;
      if (a && !a.isHelper && !(a instanceof ActiveSelection)) this.activeLayerId = a.id || null;
      c.discardActiveObject();
    }
    if (t === 'crop') this.startCrop();
    if (t === 'move' && !c.getActiveObject() && this.activeLayerId) {
      const l = this.layerById(this.activeLayerId);
      if (l && l.selectable && l.visible !== false) c.setActiveObject(l);
    }
    this.updateBrush();
    c.requestRenderAll();
    this.emit();
  }

  updateBrush() {
    const c = this.canvas;
    if (!c.isDrawingMode) return;
    const b = new PencilBrush(c);
    const eraser = this.tool === 'eraser';
    b.width = this.brush.size;
    b.color = eraser ? 'rgba(255,255,255,0.45)' : hexToRgba(this.fg, this.brush.opacity);
    b.decimate = 0.4;
    const blur = this.brush.size * (1 - this.brush.hardness) * 0.8;
    b.shadow = blur > 0.5 ? new Shadow({ color: eraser ? 'rgba(255,255,255,0.45)' : b.color, blur, offsetX: 0, offsetY: 0 }) : null;
    c.freeDrawingBrush = b;
  }

  setBrush(p: Partial<FormaEngine['brush']>) {
    this.brush = { ...this.brush, ...p };
    this.brush.size = Math.max(1, Math.min(1000, Math.round(this.brush.size)));
    this.updateBrush();
    this.emit();
  }

  setColors(fg?: string, bg?: string) {
    if (fg) this.fg = fg;
    if (bg) this.bg = bg;
    this.updateBrush();
    this.emit();
  }
  swapColors() { this.setColors(this.bg, this.fg); }
  resetColors() { this.setColors('#000000', '#ffffff'); }

  holdSpace(down: boolean) {
    if (down && !this.spaceDown) {
      this.spaceDown = true;
      if (this.tool !== 'hand') {
        this.toolBeforeSpace = this.tool;
        this.setTool('hand');
      }
    } else if (!down && this.spaceDown) {
      this.spaceDown = false;
      if (this.toolBeforeSpace) this.setTool(this.toolBeforeSpace);
      this.toolBeforeSpace = null;
    }
  }

  // ───────── edição de propriedades ─────────
  update(obj: FabricObject, props: Record<string, any>, label?: string) {
    obj.set(props);
    obj.setCoords();
    if (obj instanceof IText && ('fontFamily' in props || 'fontWeight' in props)) {
      this.refreshText(obj);
    }
    this.canvas.requestRenderAll();
    if (label) this.commit(label);
    else this.emit();
  }

  /** Carrega a fonte do texto (Google Fonts / enviada) e recalcula as medidas quando ela chega. */
  refreshText(obj: IText) {
    const fam = obj.fontFamily;
    return ensureFont(fam, obj.fontWeight as any, obj.fontStyle).then(() => {
      if (obj.fontFamily !== fam) return;
      cache.clearFontCache(fam);
      obj.initDimensions();
      obj.setCoords();
      obj.set('dirty', true);
      if (obj.group) obj.group.set('dirty', true);
      this.canvas.requestRenderAll();
      this.emit();
    });
  }

  /** Todas as fontes usadas no documento, inclusive dentro de grupos. */
  private refreshAllText(objs: FabricObject[]) {
    const walk = (o: FabricObject): void => {
      if (o instanceof IText) this.refreshText(o);
      else if (o instanceof Group) o.getObjects().forEach(walk);
    };
    objs.forEach(walk);
  }

  setAdjust(target: Lay, patch: Partial<Adjust>, label?: string) {
    if (!(target instanceof FabricImage)) return;
    const obj = target as FabricImage & Lay;
    const a: Adjust = { ...DEFAULT_ADJUST, ...(obj.adjust || {}), ...patch };
    obj.adjust = a;
    const f: any[] = [];
    if (a.exposure) f.push(new filters.Gamma({ gamma: [1 + a.exposure * 0.9, 1 + a.exposure * 0.9, 1 + a.exposure * 0.9].map((g) => Math.max(0.1, g)) as any }));
    if (a.brightness) f.push(new filters.Brightness({ brightness: a.brightness }));
    if (a.contrast) f.push(new filters.Contrast({ contrast: a.contrast }));
    if (a.saturation) f.push(new filters.Saturation({ saturation: a.saturation }));
    if (a.vibrance) f.push(new filters.Vibrance({ vibrance: a.vibrance }));
    if (a.hue) f.push(new filters.HueRotation({ rotation: a.hue }));
    if (a.temperature) f.push(new TemperatureFilter({ amount: a.temperature }));
    if (a.lut) f.push(new LutFilter({ lut: a.lut, amount: a.lutAmount }));
    if (a.grayscale) f.push(new filters.Grayscale());
    if (a.sepia) f.push(new filters.Sepia());
    if (a.invert) f.push(new filters.Invert());
    if (a.sharpen) {
      const s = a.sharpen;
      f.push(new filters.Convolute({ matrix: [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0] }));
    }
    if (a.blur) f.push(new filters.Blur({ blur: a.blur }));
    if (a.noise) f.push(new filters.Noise({ noise: a.noise }));
    if (a.pixelate) f.push(new filters.Pixelate({ blocksize: a.pixelate }));
    if (a.vignette) f.push(new VignetteFilter({ amount: a.vignette }));
    obj.filters = f;
    obj.applyFilters();
    this.canvas.requestRenderAll();
    if (label) this.commit(label);
    else this.emit();
  }

  quickAdjust(patch: Partial<Adjust>, label: string) {
    const o = this.active();
    if (!(o instanceof FabricImage)) return this.notify('Selecione uma camada de imagem');
    const cur = { ...DEFAULT_ADJUST, ...((o as Lay).adjust || {}) };
    const toggled: Partial<Adjust> = {};
    for (const k of Object.keys(patch) as (keyof Adjust)[]) {
      (toggled as any)[k] = typeof patch[k] === 'boolean' ? !cur[k] : patch[k];
    }
    this.setAdjust(o, toggled, label);
  }

  flipLayer(axis: 'x' | 'y') {
    const sel = this.selectedLayers();
    if (!sel.length) return;
    sel.forEach((o) => o.set(axis === 'x' ? 'flipX' : 'flipY', !(axis === 'x' ? o.flipX : o.flipY)));
    this.canvas.requestRenderAll();
    this.commit(axis === 'x' ? 'Espelhar horizontal' : 'Espelhar vertical');
  }

  rotateLayer(deg: number) {
    const o = this.canvas.getActiveObject();
    if (!o) return;
    o.rotate(((o.angle || 0) + deg) % 360);
    o.setCoords();
    this.canvas.requestRenderAll();
    this.commit('Girar camada');
  }

  align(where: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') {
    const o = this.canvas.getActiveObject();
    if (!o) return;
    const b = o.getBoundingRect();
    const W = this.doc.width, H = this.doc.height;
    let dx = 0, dy = 0;
    if (where === 'left') dx = -b.left;
    if (where === 'hcenter') dx = W / 2 - (b.left + b.width / 2);
    if (where === 'right') dx = W - (b.left + b.width);
    if (where === 'top') dy = -b.top;
    if (where === 'vcenter') dy = H / 2 - (b.top + b.height / 2);
    if (where === 'bottom') dy = H - (b.top + b.height);
    o.set({ left: o.left + dx, top: o.top + dy });
    o.setCoords();
    this.canvas.requestRenderAll();
    this.commit('Alinhar');
  }

  nudge(dx: number, dy: number) {
    const o = this.canvas.getActiveObject();
    if (!o || this.isEditingText()) return false;
    o.set({ left: o.left + dx, top: o.top + dy });
    o.setCoords();
    this.canvas.requestRenderAll();
    clearTimeout(this.nudgeTimer);
    this.nudgeTimer = window.setTimeout(() => this.commit('Mover'), 400);
    this.emit();
    return true;
  }
  private nudgeTimer = 0;

  isEditingText() {
    const a = this.canvas.getActiveObject();
    return a instanceof IText && a.isEditing;
  }

  async copy() {
    const a = this.canvas.getActiveObject();
    if (a) this.clipboard = await a.clone();
  }
  async cut() {
    await this.copy();
    this.deleteSelected();
  }
  async paste() {
    if (!this.clipboard) return;
    const c = (await this.clipboard.clone()) as Lay;
    this.canvas.discardActiveObject();
    c.set({ left: c.left + 20, top: c.top + 20 });
    if (c instanceof ActiveSelection) {
      const items = c.removeAll() as Lay[];
      items.forEach((o) => { o.id = uid(); this.applyLock(o); this.canvas.add(o); });
      this.canvas.setActiveObject(new ActiveSelection(items, { canvas: this.canvas }));
    } else {
      c.id = uid();
      c.name = `${c.name || 'Camada'} cópia`;
      this.applyLock(c);
      this.addLayer(c, { above: null });
    }
    this.clipboard.set({ left: this.clipboard.left + 20, top: this.clipboard.top + 20 });
    this.helpersToFront();
    this.canvas.requestRenderAll();
    this.commit('Colar');
  }

  // ───────── eventos do canvas ─────────
  private bindCanvasEvents() {
    const c = this.canvas;

    c.on('after:render', ({ ctx }: any) => {
      if (this.exporting || !ctx) return;
      const v = c.viewportTransform;
      const W = c.width, H = c.height;
      const ax = v[4], ay = v[5], aw = this.doc.width * v[0], ah = this.doc.height * v[3];
      ctx.save();
      ctx.setTransform(c.getRetinaScaling(), 0, 0, c.getRetinaScaling(), 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(ax, ay, aw, ah);
      ctx.fillStyle = this.pasteboard;
      ctx.fill('evenodd');
      if (this.cropRect) {
        const r = this.cropRect;
        const rx = v[4] + r.left * v[0], ry = v[5] + r.top * v[3];
        const rw = r.width * r.scaleX * v[0], rh = r.height * r.scaleY * v[3];
        ctx.beginPath();
        ctx.rect(ax, ay, aw, ah);
        ctx.rect(rx, ry, rw, rh);
        ctx.fillStyle = 'rgba(8,8,14,0.62)';
        ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(212,255,58,0.35)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(rx + (rw * i) / 3, ry); ctx.lineTo(rx + (rw * i) / 3, ry + rh);
          ctx.moveTo(rx, ry + (rh * i) / 3); ctx.lineTo(rx + rw, ry + (rh * i) / 3);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax - 0.5, ay - 0.5, aw + 1, ah + 1);
      ctx.restore();
    });

    c.on('path:created', ({ path }: any) => this.onPath(path));
    c.on('object:modified', () => this.commit('Transformar'));
    c.on('text:editing:exited', ({ target }: any) => {
      if (target && !target.text?.trim()) {
        c.remove(target);
        c.requestRenderAll();
      }
      this.commit('Editar texto');
    });
    const sel = () => this.emit();
    const track = () => {
      const a = c.getActiveObject() as Lay | undefined;
      if (a && !a.isHelper && !(a instanceof ActiveSelection)) this.activeLayerId = a.id || null;
      this.emit();
    };
    c.on('selection:created', track);
    c.on('selection:updated', track);
    c.on('selection:cleared', () => {
      // no Mover, clicar no vazio desmarca; nas outras ferramentas a camada ativa continua
      if (this.tool === 'move' && !this.restoring) this.activeLayerId = null;
      this.emit();
    });
    c.on('object:moving', sel);
    c.on('object:scaling', sel);
    c.on('object:rotating', sel);
    c.on('text:changed', sel);

    c.on('mouse:down', (e) => this.onDown(e));
    c.on('mouse:move', (e) => this.onMove(e));
    c.on('mouse:up', (e) => this.onUp(e));
    c.on('mouse:out', () => { this.cursor = null; this.emit(); });

    c.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.pow(0.998, e.deltaY * (e.deltaMode === 1 ? 30 : 1));
        this.zoomTo(this.zoom * factor, c.getViewportPoint(e));
      } else {
        c.relativePan(new Point(-e.deltaX - (e.shiftKey ? e.deltaY : 0), e.shiftKey ? 0 : -e.deltaY));
        this.emit();
      }
    });
  }

  private onPath(path: FabricObject) {
    const c = this.canvas;
    c.remove(path);
    const eraser = this.tool === 'eraser';
    let target = this.active();
    if (eraser) {
      if (!target || target instanceof ActiveSelection) {
        c.requestRenderAll();
        return this.notify('Selecione a camada que quer apagar');
      }
      path.set({ stroke: '#000', globalCompositeOperation: 'destination-out' });
      if (path.shadow) path.shadow.color = '#000';
    }
    if (!eraser && (!target || !(target instanceof Group) || (target as Lay).kind !== 'paint')) {
      const g = new Group([], { interactive: false }) as Group & Lay;
      this.prep(g, 'paint');
      this.addLayer(g, { select: false });
      target = g;
    }
    const g = this.ensurePaintTarget(target!);
    g.add(path);
    g.set('dirty', true);
    this.focusLayer(g);
    c.requestRenderAll();
    this.commit(eraser ? 'Borracha' : 'Pincel');
  }

  private sample(e: TPointerEvent) {
    const vp = this.canvas.getViewportPoint(e);
    const r = this.canvas.getRetinaScaling();
    const px = this.canvas.getContext().getImageData(Math.round(vp.x * r), Math.round(vp.y * r), 1, 1).data;
    if (px[3] === 0) return null;
    return '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  private onDown(opt: TPointerEventInfo) {
    const c = this.canvas;
    const p = opt.scenePoint;
    const e = opt.e as MouseEvent;
    switch (this.tool) {
      case 'hand':
        this.drag = { start: p, lastVp: c.getViewportPoint(opt.e) };
        c.setCursor('grabbing');
        break;
      case 'zoom':
        this.zoomTo(this.zoom * (e.altKey ? 1 / 1.5 : 1.5), c.getViewportPoint(opt.e));
        break;
      case 'eyedropper': {
        const col = this.sample(opt.e);
        if (col) e.altKey ? this.setColors(undefined, col) : this.setColors(col);
        this.drag = { start: p };
        break;
      }
      case 'bucket': {
        const t = opt.target as Lay | undefined;
        if (t && !t.isHelper && !(t instanceof FabricImage) && !(t instanceof Group)) {
          this.update(t, t instanceof Line ? { stroke: this.fg } : { fill: this.fg }, 'Lata de tinta');
        } else if (p.x >= 0 && p.y >= 0 && p.x <= this.doc.width && p.y <= this.doc.height) {
          this.setBackground(this.fg);
        }
        break;
      }
      case 'text': {
        const t = opt.target as Lay | undefined;
        if (t instanceof IText) {
          c.setActiveObject(t);
          t.enterEditing();
          t.setCursorByClick(opt.e);
          break;
        }
        const it = new IText('Seu texto', {
          left: p.x, top: p.y, fontFamily: this.text.font, fontSize: this.text.size,
          fontWeight: this.text.weight, fill: this.fg, editingBorderColor: '#7c5cff',
          cursorColor: '#7c5cff', selectionColor: 'rgba(124,92,255,0.3)',
        }) as IText & Lay;
        it.set({ top: p.y - it.height / 2 });
        this.refreshText(it);
        this.prep(it, 'text', 'Texto');
        this.addLayer(it);
        this.setTool('move');
        c.setActiveObject(it);
        it.enterEditing();
        it.selectAll();
        this.commit('Texto');
        break;
      }
      case 'rect':
      case 'ellipse':
      case 'line':
      case 'marquee':
      case 'gradient': {
        let obj: FabricObject;
        const fill = this.shape.fill ? this.fg : 'transparent';
        const stroke = this.shape.stroke ? (this.shape.fill ? this.bg : this.fg) : undefined;
        const sw = this.shape.stroke ? this.shape.strokeWidth : 0;
        if (this.tool === 'rect') obj = new Rect({ left: p.x, top: p.y, width: 1, height: 1, fill, stroke, strokeWidth: sw, rx: this.shape.radius, ry: this.shape.radius, strokeUniform: true });
        else if (this.tool === 'ellipse') obj = new Ellipse({ left: p.x, top: p.y, rx: 0.5, ry: 0.5, fill, stroke, strokeWidth: sw, strokeUniform: true });
        else if (this.tool === 'line') obj = new Line([p.x, p.y, p.x, p.y], { stroke: this.fg, strokeWidth: Math.max(1, this.shape.strokeWidth), strokeLineCap: 'round' });
        else if (this.tool === 'gradient') obj = new Line([p.x, p.y, p.x, p.y], { stroke: '#ffffff', strokeWidth: 1.5, strokeUniform: true, strokeDashArray: [6, 4], objectCaching: false });
        else {
          this.setMarquee(null);
          obj = new Rect({ left: p.x, top: p.y, width: 1, height: 1, fill: 'rgba(124,92,255,0.06)', stroke: '#ffffff', strokeWidth: 1, strokeUniform: true, strokeDashArray: [5, 4], objectCaching: false });
        }
        obj.set({ selectable: false, evented: false });
        (obj as Lay).isHelper = true;
        c.add(obj);
        this.drag = { start: p, obj };
        break;
      }
    }
  }

  private onMove(opt: TPointerEventInfo) {
    const c = this.canvas;
    const p = opt.scenePoint;
    this.cursor = { x: Math.round(p.x), y: Math.round(p.y) };
    const e = opt.e as MouseEvent;
    if (!this.drag) {
      this.emit();
      return;
    }
    const s = this.drag.start;
    switch (this.tool) {
      case 'hand': {
        const vp = c.getViewportPoint(opt.e);
        const last = this.drag.lastVp!;
        c.relativePan(new Point(vp.x - last.x, vp.y - last.y));
        this.drag.lastVp = vp;
        break;
      }
      case 'eyedropper': {
        const col = this.sample(opt.e);
        if (col) this.setColors(col);
        break;
      }
      case 'rect':
      case 'marquee': {
        let w = p.x - s.x, h = p.y - s.y;
        if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
        this.drag.obj!.set({ left: Math.min(s.x, s.x + w), top: Math.min(s.y, s.y + h), width: Math.abs(w), height: Math.abs(h) });
        break;
      }
      case 'ellipse': {
        let w = p.x - s.x, h = p.y - s.y;
        if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
        this.drag.obj!.set({ left: Math.min(s.x, s.x + w), top: Math.min(s.y, s.y + h), rx: Math.abs(w) / 2, ry: Math.abs(h) / 2 });
        break;
      }
      case 'line':
      case 'gradient': {
        let x2 = p.x, y2 = p.y;
        if (e.shiftKey) {
          const ang = Math.round(Math.atan2(y2 - s.y, x2 - s.x) / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.hypot(x2 - s.x, y2 - s.y);
          x2 = s.x + Math.cos(ang) * len; y2 = s.y + Math.sin(ang) * len;
        }
        (this.drag.obj as Line).set({ x2, y2 });
        break;
      }
    }
    this.drag.obj?.setCoords();
    c.requestRenderAll();
    this.emit();
  }

  private onUp(_opt: TPointerEventInfo) {
    const c = this.canvas;
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (this.tool === 'hand') {
      c.setCursor('grab');
      this.emit();
      return;
    }
    const obj = d.obj as Lay | undefined;
    if (!obj) return;
    c.remove(obj);
    obj.isHelper = false;
    obj.set({ selectable: true, evented: true });
    if (this.tool === 'marquee') {
      this.setMarquee({ left: obj.left, top: obj.top, width: obj.width, height: obj.height });
      return;
    }
    if (this.tool === 'gradient') return this.applyGradient(obj as Line);
    const tiny = this.tool === 'line'
      ? Math.hypot((obj as Line).x2! - (obj as Line).x1!, (obj as Line).y2! - (obj as Line).y1!) < 3
      : obj.width < 3 && obj.height < 3;
    if (tiny) {
      const sz = Math.round(Math.min(this.doc.width, this.doc.height) / 5);
      if (this.tool === 'rect') obj.set({ width: sz, height: sz, left: d.start.x - sz / 2, top: d.start.y - sz / 2 });
      else if (this.tool === 'ellipse') obj.set({ rx: sz / 2, ry: sz / 2, left: d.start.x - sz / 2, top: d.start.y - sz / 2 });
      else (obj as Line).set({ x2: d.start.x + sz });
    }
    obj.setCoords();
    this.prep(obj, 'shape', this.nextName(this.tool === 'rect' ? 'Retângulo' : this.tool === 'ellipse' ? 'Elipse' : 'Linha'));
    this.addLayer(obj);
    this.setTool('move');
    c.setActiveObject(obj);
    this.commit('Forma');
  }

  private applyGradient(l: Line) {
    const len = Math.hypot(l.x2! - l.x1!, l.y2! - l.y1!);
    if (len < 4) return this.canvas.requestRenderAll();
    const stops = [{ offset: 0, color: this.fg }, { offset: 1, color: this.bg }];
    let target = this.active();
    const usable = target && !(target instanceof FabricImage) && !(target instanceof Group) && !(target instanceof Line) && !(target instanceof ActiveSelection);
    if (!usable) {
      const r = new Rect({ left: 0, top: 0, width: this.doc.width, height: this.doc.height }) as Lay;
      this.prep(r, 'shape', this.nextName('Gradiente'));
      this.addLayer(r);
      target = r;
    }
    const t = target!;
    const inv = util.invertTransform(t.calcTransformMatrix());
    const a = util.transformPoint(new Point(l.x1!, l.y1!), inv);
    const b = util.transformPoint(new Point(l.x2!, l.y2!), inv);
    const ox = t.width / 2, oy = t.height / 2;
    t.set('fill', new Gradient({
      type: 'linear', gradientUnits: 'pixels',
      coords: { x1: a.x + ox, y1: a.y + oy, x2: b.x + ox, y2: b.y + oy },
      colorStops: stops,
    }));
    t.set('dirty', true);
    this.focusLayer(t);
    this.canvas.requestRenderAll();
    this.commit('Gradiente');
  }
}

export function kindLabel(k: LayerKind) {
  return { image: 'Imagem', text: 'Texto', shape: 'Forma', paint: 'Camada', group: 'Grupo', element: 'Elemento' }[k];
}
