// Modelo de dados do Forma Vídeo.
// A estrutura segue o modelo do FilmCraft (MIT/Apache-2.0, github.com/storytold/filmcraft):
// sequência → trilhas → itens (início, duração, ponto de entrada na mídia, velocidade),
// transições com "de"/"para" e alinhamento no corte, e parâmetros com keyframes.
// Diferença: o tempo de edição é contado em quadros inteiros da sequência (edição exata,
// sem arredondamento de ponto flutuante), e a mídia é lida pelo navegador.

export type MediaKind = 'video' | 'audio' | 'image';

export type Media = {
  id: string;
  name: string;
  kind: MediaKind;
  type: string; // MIME
  duration: number; // segundos (imagens: 0 = sem limite)
  width: number;
  height: number;
  hasAudio: boolean;
  size: number;
  thumbs?: string[]; // miniaturas ao longo da mídia
  peaks?: number[]; // forma de onda (0..1), 100 por segundo
};

export type ClipKind = 'video' | 'audio' | 'image' | 'title' | 'color';
export type TrackKind = 'video' | 'audio';

export type Interp = 'linear' | 'ease' | 'hold';
export type Keyframe = { f: number; v: number; i: Interp }; // f: quadro relativo ao início do clipe
export type Param = { v: number; k?: Keyframe[] };

export type Transform = { x: Param; y: Param; scale: Param; rotation: Param; opacity: Param };

export type Fx = {
  brightness: number; contrast: number; saturation: number; hue: number;
  temperature: number; blur: number; vignette: number;
  grayscale: boolean; sepia: boolean; invert: boolean;
};

export type Title = {
  text: string; font: string; size: number; weight: number; color: string;
  align: 'left' | 'center' | 'right'; bg: string | null; shadow: boolean; stroke: number; strokeColor: string;
};

export type Clip = {
  id: string;
  kind: ClipKind;
  media?: string; // id da mídia
  name: string;
  start: number; // quadro na sequência
  duration: number; // quadros
  sourceIn: number; // segundos na mídia
  speed: number;
  enabled: boolean;
  link?: string; // vídeo ↔ áudio da mesma fonte
  volume: Param; // dB
  muted?: boolean;
  transform: Transform;
  fx: Fx;
  blend: GlobalCompositeOperation;
  title?: Title;
  color?: string;
  fadeIn?: number; // quadros de fade de áudio
  fadeOut?: number;
};

export type TransitionType = 'dissolve' | 'dip-black' | 'dip-white' | 'wipe-left' | 'wipe-right' | 'slide-left' | 'slide-up' | 'zoom' | 'blur';
export type Align = 'center' | 'start' | 'end';

export type Transition = {
  id: string;
  type: TransitionType;
  start: number;
  duration: number;
  from: string | null; // clipe que sai (null = vindo do nada)
  to: string | null; // clipe que entra (null = indo para o nada)
  align: Align;
};

export type Track = {
  id: string;
  kind: TrackKind;
  name: string;
  clips: Clip[];
  transitions: Transition[];
  locked: boolean;
  hidden: boolean; // vídeo: olho desligado
  muted: boolean;
  solo: boolean;
  volume: number; // dB
};

export type Marker = { id: string; f: number; name: string; color: string };

export type Sequence = {
  name: string;
  width: number;
  height: number;
  fps: number;
  bg: string;
  tracks: Track[]; // vídeo de cima para baixo (V3, V2, V1), depois áudio (A1, A2…)
  markers: Marker[];
  inPoint: number | null;
  outPoint: number | null;
};

export type Project = { version: 1; seq: Sequence; media: Media[] };

// ───────────────────────── criação ─────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 10);
export const param = (v: number): Param => ({ v });

export const DEFAULT_FX: Fx = {
  brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 0, blur: 0, vignette: 0,
  grayscale: false, sepia: false, invert: false,
};

export const DEFAULT_TITLE: Title = {
  text: 'Seu título', font: 'Inter', size: 120, weight: 800, color: '#ffffff', align: 'center',
  bg: null, shadow: true, stroke: 0, strokeColor: '#000000',
};

export function newTransform(): Transform {
  return { x: param(0), y: param(0), scale: param(100), rotation: param(0), opacity: param(100) };
}

export function newClip(kind: ClipKind, start: number, duration: number, extra: Partial<Clip> = {}): Clip {
  return {
    id: uid(), kind, name: kind, start, duration, sourceIn: 0, speed: 1, enabled: true,
    volume: param(0), transform: newTransform(), fx: { ...DEFAULT_FX }, blend: 'source-over', ...extra,
  };
}

export function newTrack(kind: TrackKind, n: number): Track {
  return {
    id: uid(), kind, name: `${kind === 'video' ? 'V' : 'A'}${n}`, clips: [], transitions: [],
    locked: false, hidden: false, muted: false, solo: false, volume: 0,
  };
}

export const SEQ_PRESETS = [
  { id: '1080p', label: 'Full HD 1920×1080', w: 1920, h: 1080 },
  { id: '4k', label: '4K UHD 3840×2160', w: 3840, h: 2160 },
  { id: '720p', label: 'HD 1280×720', w: 1280, h: 720 },
  { id: 'vertical', label: 'Vertical 1080×1920 (Reels, TikTok)', w: 1080, h: 1920 },
  { id: 'square', label: 'Quadrado 1080×1080', w: 1080, h: 1080 },
  { id: 'feed', label: 'Feed 1080×1350', w: 1080, h: 1350 },
];

export function newSequence(name = 'Sequência 01', w = 1920, h = 1080, fps = 30): Sequence {
  return {
    name, width: w, height: h, fps, bg: '#000000',
    tracks: [newTrack('video', 3), newTrack('video', 2), newTrack('video', 1), newTrack('audio', 1), newTrack('audio', 2), newTrack('audio', 3)],
    markers: [], inPoint: null, outPoint: null,
  };
}

// ───────────────────────── tempo ─────────────────────────
export const end = (c: { start: number; duration: number }) => c.start + c.duration;

export function seqDuration(s: Sequence) {
  let d = 0;
  for (const t of s.tracks) for (const c of t.clips) d = Math.max(d, end(c));
  return d;
}

/** Código de tempo HH:MM:SS:QQ. */
export function timecode(frame: number, fps: number) {
  const f = Math.max(0, Math.round(frame));
  const fr = f % fps;
  const total = Math.floor(f / fps);
  const s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}:${p(fr)}`;
}

export function parseTimecode(text: string, fps: number): number | null {
  const parts = text.trim().split(/[:;.]/).map((x) => parseInt(x, 10));
  if (!parts.length || parts.some((n) => isNaN(n))) return null;
  while (parts.length < 4) parts.unshift(0);
  const [h, m, s, f] = parts.slice(-4);
  return ((h * 60 + m) * 60 + s) * fps + f;
}

/** Tempo da mídia (segundos) para o quadro `f` da sequência. */
export function mediaTime(c: Clip, f: number, fps: number) {
  return c.sourceIn + ((f - c.start) / fps) * c.speed;
}

/** Quantos quadros de mídia restam depois do fim do clipe (alças), em quadros da sequência. */
export function maxDurationFor(c: Clip, m: Media | undefined, fps: number) {
  if (!m || m.kind === 'image' || !m.duration) return Infinity;
  return Math.max(1, Math.floor(((m.duration - c.sourceIn) / c.speed) * fps));
}

// ───────────────────────── keyframes ─────────────────────────
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Valor do parâmetro em `rel` (quadro relativo ao início do clipe). */
export function valueAt(p: Param, rel: number) {
  const k = p.k;
  if (!k || !k.length) return p.v;
  if (rel <= k[0].f) return k[0].v;
  const last = k[k.length - 1];
  if (rel >= last.f) return last.v;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (rel >= a.f && rel <= b.f) {
      if (a.i === 'hold') return a.v;
      let t = (rel - a.f) / Math.max(1, b.f - a.f);
      if (a.i === 'ease') t = ease(t);
      return a.v + (b.v - a.v) * t;
    }
  }
  return p.v;
}

/** Define o valor em `rel`: muda o valor fixo ou cria/atualiza um keyframe se o parâmetro estiver animado. */
export function setParam(p: Param, rel: number, v: number): Param {
  if (!p.k || !p.k.length) return { v };
  const k = p.k.filter((x) => x.f !== rel);
  const prev = [...p.k].reverse().find((x) => x.f < rel);
  k.push({ f: rel, v, i: prev?.i || 'linear' });
  k.sort((a, b) => a.f - b.f);
  return { v, k };
}

export function toggleAnimate(p: Param, rel: number): Param {
  if (p.k && p.k.length) return { v: valueAt(p, rel) };
  return { v: p.v, k: [{ f: rel, v: p.v, i: 'linear' }] };
}

export function hasKeyAt(p: Param, rel: number) {
  return !!p.k?.some((x) => x.f === rel);
}

export function removeKey(p: Param, rel: number): Param {
  const k = (p.k || []).filter((x) => x.f !== rel);
  return k.length ? { v: p.v, k } : { v: valueAt(p, rel) };
}

export function keyTimes(c: Clip): number[] {
  const all = new Set<number>();
  const add = (p: Param) => p.k?.forEach((x) => all.add(x.f));
  Object.values(c.transform).forEach(add);
  add(c.volume);
  return [...all].sort((a, b) => a - b);
}

/** Corta os keyframes de um parâmetro depois de dividir o clipe em `at` (relativo). */
function splitParam(p: Param, at: number): [Param, Param] {
  if (!p.k || !p.k.length) return [p, p];
  const v = valueAt(p, at);
  const left = p.k.filter((x) => x.f < at);
  const right = p.k.filter((x) => x.f > at).map((x) => ({ ...x, f: x.f - at }));
  return [
    { v, k: [...left, { f: at, v, i: 'linear' as Interp }] },
    { v, k: [{ f: 0, v, i: (left[left.length - 1]?.i || 'linear') as Interp }, ...right] },
  ];
}

// ───────────────────────── transições ─────────────────────────
export const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: 'dissolve', label: 'Dissolver cruzado' },
  { id: 'dip-black', label: 'Mergulho no preto' },
  { id: 'dip-white', label: 'Mergulho no branco' },
  { id: 'wipe-left', label: 'Cortina para a esquerda' },
  { id: 'wipe-right', label: 'Cortina para a direita' },
  { id: 'slide-left', label: 'Deslizar' },
  { id: 'slide-up', label: 'Empurrar para cima' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'blur', label: 'Desfoque' },
];

export function progress(tr: Transition, f: number) {
  if (tr.duration <= 0) return 1;
  return Math.min(1, Math.max(0, (f - tr.start) / tr.duration));
}

/** Onde a transição pode ficar (ver FilmCraft edit::transitions::bounds). */
export function trBounds(track: Track, tr: Transition): [number, number, number] | null {
  const from = tr.from ? track.clips.find((c) => c.id === tr.from) : null;
  const to = tr.to ? track.clips.find((c) => c.id === tr.to) : null;
  if (from && to) return [from.start, to.start, end(to)];
  if (to) return [to.start, to.start, end(to)];
  if (from) return [from.start, end(from), end(from)];
  return null;
}

export function placeTransition(cut: number, duration: number, align: Align, b: [number, number, number]) {
  let start = align === 'center' ? cut - Math.floor(duration / 2) : align === 'start' ? cut : cut - duration;
  start = Math.max(b[0], start);
  const d = Math.max(1, Math.min(duration, b[2] - start));
  return { start, duration: d };
}

// ───────────────────────── consultas ─────────────────────────
export function findClip(s: Sequence, id: string) {
  for (const t of s.tracks) {
    const c = t.clips.find((x) => x.id === id);
    if (c) return { track: t, clip: c };
  }
  return null;
}

export function clipsAt(t: Track, f: number) {
  return t.clips.filter((c) => c.enabled && f >= c.start && f < end(c));
}

// ───────────────────────── edições (puras: devolvem uma sequência nova) ─────────────────────────
const clone = <T,>(x: T): T => structuredClone(x);

function fixTransitions(t: Track) {
  const ids = new Set(t.clips.map((c) => c.id));
  t.transitions = t.transitions.filter((tr) => (!tr.from || ids.has(tr.from)) && (!tr.to || ids.has(tr.to)) && (tr.from || tr.to));
  // uma transição entre dois clipes só vale se eles continuarem encostados
  t.transitions = t.transitions.filter((tr) => {
    if (!tr.from || !tr.to) return true;
    const a = t.clips.find((c) => c.id === tr.from)!, b = t.clips.find((c) => c.id === tr.to)!;
    return end(a) === b.start;
  });
  for (const tr of t.transitions) {
    const b = trBounds(t, tr);
    if (!b) continue;
    const p = placeTransition(b[1], tr.duration, tr.align, b);
    tr.start = p.start; tr.duration = p.duration;
  }
  t.clips.sort((a, b) => a.start - b.start);
}

/** Libera espaço em [a, b) na trilha (sobrescrever, como no Premiere): corta ou remove o que estiver lá. */
function clearRange(t: Track, a: number, b: number, fps: number, except = new Set<string>()) {
  const out: Clip[] = [];
  for (const c of t.clips) {
    if (except.has(c.id)) { out.push(c); continue; }
    const ce = end(c);
    if (ce <= a || c.start >= b) { out.push(c); continue; }
    if (c.start < a && ce > b) {
      // o novo clipe cai no meio: divide em dois pedaços
      const [l, r] = splitClip(c, a, fps);
      const [, r2] = splitClip(r, b, fps);
      out.push(l, r2);
    } else if (c.start < a) {
      out.push({ ...c, duration: a - c.start });
    } else if (ce > b) {
      const cut = b - c.start;
      out.push({ ...c, start: b, duration: ce - b, sourceIn: c.sourceIn + (cut / fps) * c.speed });
    }
  }
  t.clips = out;
}

export function splitClip(c: Clip, at: number, fps: number): [Clip, Clip] {
  const rel = at - c.start;
  const left: Clip = clone(c);
  const right: Clip = clone(c);
  left.duration = rel;
  right.id = uid();
  right.start = at;
  right.duration = c.duration - rel;
  right.sourceIn = c.sourceIn + (rel / fps) * c.speed;
  for (const key of Object.keys(c.transform) as (keyof Transform)[]) {
    const [l, r] = splitParam(c.transform[key], rel);
    left.transform[key] = l; right.transform[key] = r;
  }
  const [vl, vr] = splitParam(c.volume, rel);
  left.volume = vl; right.volume = vr;
  left.fadeOut = 0; right.fadeIn = 0;
  return [left, right];
}

export type Edit = { seq: Sequence; select?: string[] };

export function addClip(s: Sequence, trackId: string, c: Clip): Edit {
  const q = clone(s);
  const t = q.tracks.find((x) => x.id === trackId)!;
  clearRange(t, c.start, end(c), q.fps);
  t.clips.push(c);
  fixTransitions(t);
  return { seq: q, select: [c.id] };
}

/** Insere vídeo com o áudio vinculado (como arrastar uma mídia do Projeto para a linha do tempo). */
export function addLinked(s: Sequence, vTrack: string, aTrack: string | null, v: Clip, a: Clip | null): Edit {
  let e = addClip(s, vTrack, v);
  if (a && aTrack) {
    e = addClip(e.seq, aTrack, a);
    e.select = [v.id, a.id];
  }
  return e;
}

export function linkedIds(s: Sequence, ids: string[]) {
  const set = new Set(ids);
  for (const id of ids) {
    const f = findClip(s, id);
    if (f?.clip.link) for (const t of s.tracks) for (const c of t.clips) if (c.link === f.clip.link) set.add(c.id);
  }
  return [...set];
}

/** Move clipes `dFrames` no tempo e `dTrack` trilhas (do mesmo tipo), sobrescrevendo o destino. */
export function moveClips(s: Sequence, ids: string[], dFrames: number, dTrack: number, trackKind?: TrackKind): Edit {
  const q = clone(s);
  const moving: { clip: Clip; to: Track }[] = [];
  const minStart = Math.min(...ids.map((id) => findClip(q, id)?.clip.start ?? 0));
  dFrames = Math.max(-minStart, dFrames);
  for (const id of ids) {
    const f = findClip(q, id);
    if (!f || f.track.locked) continue;
    const same = q.tracks.filter((t) => t.kind === f.track.kind);
    let idx = same.indexOf(f.track);
    // só o tipo de trilha que foi arrastado muda de trilha (o par vinculado fica na sua)
    if (!trackKind || f.track.kind === trackKind) idx = Math.min(same.length - 1, Math.max(0, idx + dTrack));
    const to = same[idx].locked ? f.track : same[idx];
    f.track.clips = f.track.clips.filter((c) => c.id !== id);
    moving.push({ clip: { ...f.clip, start: f.clip.start + dFrames }, to });
  }
  for (const m of moving) {
    clearRange(m.to, m.clip.start, end(m.clip), q.fps, new Set(moving.map((x) => x.clip.id)));
    m.to.clips.push(m.clip);
  }
  q.tracks.forEach(fixTransitions);
  return { seq: q, select: ids };
}

/** Apara a borda de um clipe (e do vinculado). `edge` 'in' muda o início, 'out' o fim. */
export function trimClip(s: Sequence, id: string, edge: 'in' | 'out', delta: number, media: Map<string, Media>, ripple = false): Edit {
  const q = clone(s);
  const ids = linkedIds(q, [id]);
  for (const cid of ids) {
    const f = findClip(q, cid);
    if (!f || f.track.locked) continue;
    const c = f.clip, m = c.media ? media.get(c.media) : undefined;
    if (edge === 'out') {
      const max = maxDurationFor(c, m, q.fps);
      const next = f.track.clips.filter((x) => x.id !== c.id && x.start >= end(c)).sort((a, b) => a.start - b.start)[0];
      let d = Math.max(1, Math.min(max, c.duration + delta));
      if (!ripple && next) d = Math.min(d, next.start - c.start);
      const diff = d - c.duration;
      c.duration = d;
      if (ripple && diff) for (const x of f.track.clips) if (x.id !== c.id && x.start >= end(c) - diff) x.start += diff;
    } else {
      const minIn = m && m.kind !== 'image' ? -Math.floor((c.sourceIn / c.speed) * q.fps) : -Infinity;
      const prev = f.track.clips.filter((x) => x.id !== c.id && end(x) <= c.start).sort((a, b) => end(b) - end(a))[0];
      let d = Math.max(minIn, Math.min(c.duration - 1, delta));
      if (prev) d = Math.max(d, end(prev) - c.start);
      d = Math.max(d, -c.start);
      c.start += d; c.duration -= d; c.sourceIn += (d / q.fps) * c.speed;
      // keyframes ficam no mesmo ponto da mídia
      const shift = (p: Param) => { if (p.k) p.k = p.k.map((k) => ({ ...k, f: k.f - d })); };
      Object.values(c.transform).forEach(shift); shift(c.volume);
    }
  }
  q.tracks.forEach(fixTransitions);
  return { seq: q, select: [id] };
}

/** Corta (lâmina) todos os clipes sob o quadro `f`, ou só os indicados. */
export function razor(s: Sequence, f: number, onlyIds?: string[]): Edit {
  const q = clone(s);
  const sel: string[] = [];
  const linkMap = new Map<string, string>();
  for (const t of q.tracks) {
    if (t.locked) continue;
    const out: Clip[] = [];
    for (const c of t.clips) {
      if (f > c.start && f < end(c) && (!onlyIds || onlyIds.includes(c.id))) {
        const [l, r] = splitClip(c, f, q.fps);
        if (c.link) {
          if (!linkMap.has(c.link)) linkMap.set(c.link, uid());
          r.link = linkMap.get(c.link);
        }
        // transições que usavam o lado direito passam para o novo pedaço
        t.transitions.forEach((tr) => { if (tr.from === c.id) tr.from = r.id; });
        out.push(l, r);
        sel.push(r.id);
      } else out.push(c);
    }
    t.clips = out;
    fixTransitions(t);
  }
  return { seq: q, select: sel };
}

export function deleteClips(s: Sequence, ids: string[], ripple: boolean): Edit {
  const q = clone(s);
  const all = new Set(linkedIds(q, ids));
  for (const t of q.tracks) {
    if (t.locked) continue;
    const removed = t.clips.filter((c) => all.has(c.id));
    t.clips = t.clips.filter((c) => !all.has(c.id));
    if (ripple && removed.length) {
      // fecha o buraco nesta trilha (e nas trilhas vinculadas pelo mesmo intervalo)
      removed.sort((a, b) => b.start - a.start).forEach((r) => {
        const hole = r.duration;
        const blocked = t.clips.some((c) => c.start < end(r) && end(c) > r.start);
        if (!blocked) for (const c of t.clips) if (c.start >= end(r)) c.start -= hole;
      });
    }
    fixTransitions(t);
  }
  return { seq: q, select: [] };
}

/** Fecha o espaço vazio que contém `f` na trilha. */
export function closeGap(s: Sequence, trackId: string, f: number): Edit | null {
  const q = clone(s);
  const t = q.tracks.find((x) => x.id === trackId);
  if (!t || t.locked) return null;
  const sorted = [...t.clips].sort((a, b) => a.start - b.start);
  let prevEnd = 0;
  for (const c of sorted) {
    if (f >= prevEnd && f < c.start) {
      const gap = c.start - prevEnd;
      for (const x of t.clips) if (x.start >= c.start) x.start -= gap;
      fixTransitions(t);
      return { seq: q };
    }
    prevEnd = Math.max(prevEnd, end(c));
  }
  return null;
}

export function updateClip(s: Sequence, id: string, fn: (c: Clip) => void): Edit {
  const q = clone(s);
  const f = findClip(q, id);
  if (f) { fn(f.clip); fixTransitions(f.track); }
  return { seq: q, select: [id] };
}

export function setSpeed(s: Sequence, id: string, speed: number, media: Map<string, Media>): Edit {
  const q = clone(s);
  for (const cid of linkedIds(q, [id])) {
    const f = findClip(q, cid);
    if (!f) continue;
    const c = f.clip;
    const srcLen = (c.duration / q.fps) * c.speed;
    c.speed = speed;
    let d = Math.max(1, Math.round((srcLen / speed) * q.fps));
    const next = f.track.clips.filter((x) => x.id !== c.id && x.start >= end(c)).sort((a, b) => a.start - b.start)[0];
    if (next) d = Math.min(d, next.start - c.start);
    c.duration = Math.min(d, maxDurationFor(c, c.media ? media.get(c.media) : undefined, q.fps));
    fixTransitions(f.track);
  }
  return { seq: q, select: [id] };
}

/** Aplica uma transição na borda de um clipe: entre clipes encostados vira transição cruzada, senão fade. */
export function applyTransition(s: Sequence, clipId: string, edge: 'in' | 'out', type: TransitionType, duration: number): Edit | null {
  const q = clone(s);
  const f = findClip(q, clipId);
  if (!f || f.track.locked) return null;
  const t = f.track, c = f.clip;
  let from: string | null = null, to: string | null = null, align: Align;
  if (edge === 'in') {
    const prev = t.clips.find((x) => end(x) === c.start);
    from = prev?.id || null; to = c.id; align = prev ? 'center' : 'start';
  } else {
    const next = t.clips.find((x) => x.start === end(c));
    from = c.id; to = next?.id || null; align = next ? 'center' : 'end';
  }
  t.transitions = t.transitions.filter((tr) => !(tr.from === from && tr.to === to));
  const tr: Transition = { id: uid(), type, start: 0, duration, from, to, align };
  const b = trBounds(t, tr);
  if (!b) return null;
  Object.assign(tr, placeTransition(b[1], duration, align, b));
  t.transitions.push(tr);
  return { seq: q, select: [clipId] };
}

export function updateTransition(s: Sequence, id: string, patch: Partial<Pick<Transition, 'type' | 'duration' | 'align'>>): Edit {
  const q = clone(s);
  for (const t of q.tracks) {
    const tr = t.transitions.find((x) => x.id === id);
    if (!tr) continue;
    Object.assign(tr, patch);
    const b = trBounds(t, tr);
    if (b) Object.assign(tr, placeTransition(b[1], tr.duration, tr.align, b));
  }
  return { seq: q };
}

export function removeTransition(s: Sequence, id: string): Edit {
  const q = clone(s);
  for (const t of q.tracks) t.transitions = t.transitions.filter((x) => x.id !== id);
  return { seq: q, select: [] };
}

export function unlink(s: Sequence, ids: string[]): Edit {
  const q = clone(s);
  for (const id of linkedIds(q, ids)) { const f = findClip(q, id); if (f) delete f.clip.link; }
  return { seq: q, select: ids };
}

export function duplicateClips(s: Sequence, ids: string[]): Edit {
  let q = clone(s);
  const all = linkedIds(q, ids);
  const span = Math.max(...all.map((id) => end(findClip(q, id)!.clip))) - Math.min(...all.map((id) => findClip(q, id)!.clip.start));
  const links = new Map<string, string>();
  const sel: string[] = [];
  for (const id of all) {
    const f = findClip(q, id)!;
    const c: Clip = { ...clone(f.clip), id: uid(), start: f.clip.start + span };
    if (c.link) { if (!links.has(c.link)) links.set(c.link, uid()); c.link = links.get(c.link); }
    q = addClip(q, f.track.id, c).seq;
    sel.push(c.id);
  }
  return { seq: q, select: sel };
}

export function addTrack(s: Sequence, kind: TrackKind): Edit {
  const q = clone(s);
  const n = q.tracks.filter((t) => t.kind === kind).length + 1;
  const t = newTrack(kind, n);
  if (kind === 'video') q.tracks.unshift(t); else q.tracks.push(t);
  return { seq: q };
}

export function updateTrack(s: Sequence, id: string, patch: Partial<Track>): Edit {
  const q = clone(s);
  const t = q.tracks.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
  return { seq: q };
}

/** Pontos de encaixe (bordas de clipes, marcadores, início). */
export function snapPoints(s: Sequence, exclude: Set<string>, playhead: number) {
  const pts = new Set<number>([0, playhead]);
  for (const t of s.tracks) for (const c of t.clips) if (!exclude.has(c.id)) { pts.add(c.start); pts.add(end(c)); }
  for (const m of s.markers) pts.add(m.f);
  return [...pts];
}
