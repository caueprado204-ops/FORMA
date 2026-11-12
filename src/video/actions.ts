// Ações do editor (usadas pelos painéis, menus e atalhos).
import {
  type Clip, type Media, type TransitionType, DEFAULT_TITLE, addClip, addLinked, applyTransition, closeGap, deleteClips,
  duplicateClips, end, findClip, linkedIds, newClip, razor, removeTransition, uid, unlink, seqDuration,
} from './model';
import { store } from './store';
import { engine } from './engine';
import { importBlob, importFile } from './media';

export const DEFAULT_IMAGE_SECONDS = 5;

export function mediaMap() { return store.media; }

/** Primeira trilha (do tipo) onde [start, start+dur) está livre, começando pela preferida. */
function freeTrack(kind: 'video' | 'audio', start: number, dur: number, prefer?: string) {
  const tracks = store.seq.tracks.filter((t) => t.kind === kind && !t.locked);
  const order = kind === 'video' ? [...tracks].reverse() : tracks; // V1 primeiro
  if (prefer) { const p = tracks.find((t) => t.id === prefer); if (p) return p; }
  return order.find((t) => !t.clips.some((c) => c.start < start + dur && end(c) > start)) || order[0];
}

export function clipFromMedia(m: Media, start: number): { v: Clip | null; a: Clip | null } {
  const fps = store.seq.fps;
  const dur = m.kind === 'image' ? DEFAULT_IMAGE_SECONDS * fps : Math.max(1, Math.floor(m.duration * fps));
  if (m.kind === 'audio') return { v: null, a: newClip('audio', start, dur, { media: m.id, name: m.name }) };
  const link = m.kind === 'video' && m.hasAudio ? uid() : undefined;
  const v = newClip(m.kind === 'image' ? 'image' : 'video', start, dur, { media: m.id, name: m.name, link });
  const a = link ? newClip('audio', start, dur, { media: m.id, name: m.name, link }) : null;
  return { v, a };
}

/** Coloca uma mídia na linha do tempo. Sem trilha indicada, vai para o indicador na primeira trilha livre. */
export function placeMedia(m: Media, start = store.playhead, trackId?: string) {
  const seq = store.seq;
  // primeira mídia de vídeo numa sequência vazia: a sequência assume o tamanho dela
  if (!seqDuration(seq) && m.kind === 'video' && m.width && m.height && (m.width !== seq.width || m.height !== seq.height)) {
    const w = m.width - (m.width % 2), h = m.height - (m.height % 2);
    store.seq = { ...seq, width: w, height: h };
    engine.resize();
    store.notify(`Sequência ajustada ao vídeo: ${w}×${h}`);
  }
  const { v, a } = clipFromMedia(m, start);
  const dur = (v || a)!.duration;
  const targetTrack = trackId ? store.seq.tracks.find((t) => t.id === trackId) : undefined;
  if (v) {
    const vt = targetTrack?.kind === 'video' ? targetTrack : freeTrack('video', start, dur);
    const at = targetTrack?.kind === 'audio' ? targetTrack : a ? freeTrack('audio', start, dur) : null;
    store.apply(addLinked(store.seq, vt.id, at?.id || null, v, a), 'Inserir clipe');
  } else if (a) {
    const at = targetTrack?.kind === 'audio' ? targetTrack : freeTrack('audio', start, dur);
    store.apply(addClip(store.seq, at.id, a), 'Inserir áudio');
  }
  engine.requestDraw();
}

export async function importFiles(files: File[]) {
  const added: Media[] = [];
  for (const f of files) {
    store.notify(`Importando “${f.name}”…`);
    try {
      const { media, url } = await importFile(f);
      store.media.set(media.id, media);
      store.urls.set(media.id, url);
      added.push(media);
    } catch (e: any) {
      store.notify(e.message || `Não foi possível importar “${f.name}”`);
    }
  }
  if (added.length) { store.save(); store.notify(added.length === 1 ? `“${added[0].name}” importado` : `${added.length} arquivos importados`); }
  return added;
}

export async function importAndPlace(blob: Blob, name: string) {
  try {
    const { media, url } = await importBlob(blob, name);
    store.media.set(media.id, media);
    store.urls.set(media.id, url);
    const t = freeTrack('video', store.playhead, DEFAULT_IMAGE_SECONDS * store.seq.fps, store.seq.tracks.filter((x) => x.kind === 'video').slice(-2)[0]?.id);
    placeMedia(media, store.playhead, t.id);
  } catch {
    store.notify('Não foi possível adicionar essa imagem');
  }
}

export function removeMedia(id: string) {
  const used = store.seq.tracks.some((t) => t.clips.some((c) => c.media === id));
  if (used) {
    const ids = store.seq.tracks.flatMap((t) => t.clips.filter((c) => c.media === id).map((c) => c.id));
    store.apply(deleteClips(store.seq, ids, false), 'Remover mídia');
  }
  const url = store.urls.get(id);
  if (url) URL.revokeObjectURL(url);
  store.media.delete(id);
  store.urls.delete(id);
  store.save();
  engine.gc();
  store.emit();
}

export function addTitle(text = DEFAULT_TITLE.text) {
  const fps = store.seq.fps;
  const vt = store.seq.tracks.filter((t) => t.kind === 'video');
  const t = freeTrack('video', store.playhead, 5 * fps, vt[0]?.id);
  const c = newClip('title', store.playhead, 5 * fps, { name: text.split('\n')[0].slice(0, 30), title: { ...DEFAULT_TITLE, text } });
  store.apply(addClip(store.seq, t.id, c), 'Título');
  engine.requestDraw();
}

export function addColorMatte(color = '#7c5cff') {
  const fps = store.seq.fps;
  const vt = store.seq.tracks.filter((t) => t.kind === 'video');
  const t = freeTrack('video', store.playhead, 5 * fps, vt[vt.length - 1]?.id);
  const c = newClip('color', store.playhead, 5 * fps, { name: 'Fundo de cor', color });
  store.apply(addClip(store.seq, t.id, c), 'Fundo de cor');
  engine.requestDraw();
}

export function splitAtPlayhead() {
  const sel = store.selection.length ? linkedIds(store.seq, store.selection) : undefined;
  const e = razor(store.seq, store.playhead, sel);
  if (!e.select?.length) return store.notify('Nada para cortar no indicador');
  store.apply(e, 'Adicionar edição');
}

export function deleteSelection(ripple = false) {
  if (store.selTransition) {
    store.apply(removeTransition(store.seq, store.selTransition), 'Remover transição');
    store.selTransition = null;
    return;
  }
  if (!store.selection.length) return;
  store.apply(deleteClips(store.seq, store.selection, ripple), ripple ? 'Exclusão com ondulação' : 'Limpar');
  engine.gc();
  engine.requestDraw();
}

export function duplicateSelection() {
  if (!store.selection.length) return;
  store.apply(duplicateClips(store.seq, store.selection), 'Duplicar');
}

export function unlinkSelection() {
  if (!store.selection.length) return;
  store.apply(unlink(store.seq, store.selection), 'Desvincular');
}

export function toggleEnable() {
  if (!store.selection.length) return;
  const q = structuredClone(store.seq);
  for (const id of store.selection) { const f = findClip(q, id); if (f) f.clip.enabled = !f.clip.enabled; }
  store.apply({ seq: q }, 'Ativar/desativar');
  engine.requestDraw();
}

/** Aplica a transição na borda do clipe selecionado mais próxima do indicador (Ctrl+D). */
export function transitionAtPlayhead(type: TransitionType = 'dissolve', clipId?: string, edge?: 'in' | 'out') {
  const fps = store.seq.fps;
  const onVideo = (cid: string) => store.seq.tracks.some((t) => t.kind === 'video' && t.clips.some((c) => c.id === cid));
  let id = clipId || store.selection.find(onVideo);
  if (!id) {
    // sem seleção: clipe de vídeo sob o indicador
    for (const t of store.seq.tracks.filter((x) => x.kind === 'video')) {
      const c = t.clips.find((x) => store.playhead >= x.start && store.playhead <= end(x));
      if (c) { id = c.id; break; }
    }
    id = id || store.selection[0];
  }
  const f = id ? findClip(store.seq, id) : null;
  if (!f) return store.notify('Selecione um clipe para aplicar a transição');
  const e = edge || (Math.abs(store.playhead - f.clip.start) <= Math.abs(store.playhead - end(f.clip)) ? 'in' : 'out');
  const dur = Math.min(Math.round(fps * 1), Math.max(2, Math.floor(f.clip.duration / 2)));
  const r = applyTransition(store.seq, f.clip.id, e, type, dur);
  if (r) {
    store.apply(r, 'Aplicar transição');
    const tr = r.seq.tracks.flatMap((t) => t.transitions).find((x) => (e === 'in' ? x.to === f.clip.id : x.from === f.clip.id));
    if (tr) store.selectTransition(tr.id);
  }
  engine.requestDraw();
}

export function closeGapAt(trackId: string, f: number) {
  const e = closeGap(store.seq, trackId, f);
  if (!e) return store.notify('Nenhum espaço vazio aqui');
  store.apply(e, 'Fechar espaço');
}

// ───────── área de transferência ─────────
let clipboard: { trackIndex: number; clip: Clip }[] = [];

export function copySelection() {
  const ids = linkedIds(store.seq, store.selection);
  clipboard = ids.map((id) => {
    const f = findClip(store.seq, id)!;
    return { trackIndex: store.seq.tracks.indexOf(f.track), clip: structuredClone(f.clip) };
  });
  if (clipboard.length) store.notify(clipboard.length === 1 ? 'Clipe copiado' : `${clipboard.length} clipes copiados`);
}

export function paste() {
  if (!clipboard.length) return;
  const min = Math.min(...clipboard.map((x) => x.clip.start));
  let seq = store.seq;
  const links = new Map<string, string>();
  const sel: string[] = [];
  for (const { trackIndex, clip } of clipboard) {
    const t = seq.tracks[trackIndex] || seq.tracks.find((x) => x.kind === (clip.kind === 'audio' ? 'audio' : 'video'))!;
    const c: Clip = { ...structuredClone(clip), id: uid(), start: store.playhead + (clip.start - min) };
    if (c.link) { if (!links.has(c.link)) links.set(c.link, uid()); c.link = links.get(c.link); }
    seq = addClip(seq, t.id, c).seq;
    sel.push(c.id);
  }
  store.apply({ seq, select: sel }, 'Colar');
  engine.requestDraw();
}

/** Pontos de edição (início/fim de clipes) para ↑/↓. */
export function editPoints() {
  const s = new Set<number>([0]);
  for (const t of store.seq.tracks) for (const c of t.clips) { s.add(c.start); s.add(end(c)); }
  return [...s].sort((a, b) => a - b);
}

export function gotoEdit(dir: 1 | -1) {
  const pts = editPoints();
  const p = store.playhead;
  const next = dir > 0 ? pts.find((x) => x > p) : [...pts].reverse().find((x) => x < p);
  if (next !== undefined) { store.seek(next); engine.sync(true); engine.requestDraw(); }
}

export function addMarker() {
  const q = structuredClone(store.seq);
  if (q.markers.some((m) => m.f === store.playhead)) return;
  q.markers.push({ id: uid(), f: store.playhead, name: `Marcador ${q.markers.length + 1}`, color: '#d4ff3a' });
  q.markers.sort((a, b) => a.f - b.f);
  store.apply({ seq: q }, 'Adicionar marcador');
}

export function setInOut(which: 'in' | 'out' | 'clear') {
  const q = { ...store.seq };
  if (which === 'in') q.inPoint = store.playhead;
  else if (which === 'out') q.outPoint = store.playhead;
  else { q.inPoint = null; q.outPoint = null; }
  store.apply({ seq: q }, which === 'clear' ? 'Limpar entrada e saída' : which === 'in' ? 'Marcar entrada' : 'Marcar saída');
}

export function seekTo(f: number) {
  store.seek(f);
  engine.sync(!store.playing);
  engine.requestDraw();
}
