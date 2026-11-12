// Importação de mídia: lê duração e tamanho, gera miniaturas e forma de onda,
// e guarda os arquivos no IndexedDB para o projeto reabrir depois.
import { type Media, type MediaKind, uid } from './model';

const DB = 'forma-video';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function putFile(id: string, blob: Blob) {
  try {
    const d = await db();
    await new Promise<void>((res, rej) => {
      const tx = d.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* sem armazenamento: o arquivo vale só nesta sessão */ }
}

export async function getFile(id: string): Promise<Blob | null> {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction('files').objectStore('files').get(id);
      q.onsuccess = () => res((q.result as Blob) || null);
      q.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function clearFiles(keep: Set<string>) {
  try {
    const d = await db();
    const store = d.transaction('files', 'readwrite').objectStore('files');
    const keys: IDBValidKey[] = await new Promise((res) => { const q = store.getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); });
    const tx = d.transaction('files', 'readwrite');
    keys.forEach((k) => { if (!keep.has(String(k))) tx.objectStore('files').delete(k); });
  } catch { /* ignora */ }
}

export function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv|ogv)$/i.test(file.name)) return 'video';
  if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(file.name)) return 'audio';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name)) return 'image';
  return null;
}

function once<T extends Event>(el: EventTarget, ok: string, bad = 'error', ms = 15000): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => { cleanup(); rej(new Error('tempo esgotado')); }, ms);
    const a = (e: Event) => { cleanup(); res(e as T); };
    const b = () => { cleanup(); rej(new Error('o navegador não conseguiu ler esse arquivo')); };
    const cleanup = () => { clearTimeout(t); el.removeEventListener(ok, a); el.removeEventListener(bad, b); };
    el.addEventListener(ok, a);
    el.addEventListener(bad, b);
  });
}

async function probeVideo(url: string) {
  const v = document.createElement('video');
  v.preload = 'auto';
  v.muted = true;
  v.playsInline = true;
  v.src = url;
  await once(v, 'loadedmetadata');
  const duration = isFinite(v.duration) ? v.duration : 0;
  const thumbs: string[] = [];
  const n = Math.max(1, Math.min(12, Math.ceil(duration / 2)));
  const c = document.createElement('canvas');
  const h = 72, w = Math.round((h * (v.videoWidth || 16)) / (v.videoHeight || 9));
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  for (let i = 0; i < n; i++) {
    try {
      v.currentTime = Math.min(duration - 0.05, (duration * (i + 0.5)) / n);
      await once(v, 'seeked', 'error', 5000);
      x.drawImage(v, 0, 0, w, h);
      thumbs.push(c.toDataURL('image/jpeg', 0.6));
    } catch { break; }
  }
  const hasAudio = (v as any).mozHasAudio ?? ((v as any).audioTracks ? (v as any).audioTracks.length > 0 : true);
  const out = { duration, width: v.videoWidth, height: v.videoHeight, thumbs, hasAudio: !!hasAudio };
  v.removeAttribute('src'); v.load();
  return out;
}

async function probeImage(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  const h = 72, w = Math.max(1, Math.round((h * img.naturalWidth) / img.naturalHeight));
  c.width = w; c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return { width: img.naturalWidth, height: img.naturalHeight, thumbs: [c.toDataURL('image/jpeg', 0.7)] };
}

let actx: AudioContext | null = null;
/** Forma de onda: pico por centésimo de segundo. Pula arquivos muito grandes. */
export async function waveform(blob: Blob): Promise<{ peaks: number[]; duration: number } | null> {
  if (blob.size > 300 * 1024 * 1024) return null;
  try {
    actx = actx || new OfflineAudioContext(1, 1, 44100) as unknown as AudioContext;
    const buf = await (actx as BaseAudioContext).decodeAudioData(await blob.arrayBuffer());
    const per = Math.max(1, Math.floor(buf.sampleRate / 100));
    const chans = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, i) => buf.getChannelData(i));
    const n = Math.ceil(buf.length / per);
    const peaks = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      let m = 0;
      const a = i * per, b = Math.min(buf.length, a + per);
      for (const ch of chans) for (let j = a; j < b; j += 4) { const v = Math.abs(ch[j]); if (v > m) m = v; }
      peaks[i] = Math.round(Math.min(1, m) * 100) / 100;
    }
    return { peaks, duration: buf.duration };
  } catch { return null; }
}

/** Importa um arquivo como mídia do projeto. */
export async function importFile(file: File): Promise<{ media: Media; url: string }> {
  const kind = kindOf(file);
  if (!kind) throw new Error(`“${file.name}” não é vídeo, áudio nem imagem`);
  const id = uid();
  const url = URL.createObjectURL(file);
  const base: Media = { id, name: file.name.replace(/\.[^.]+$/, ''), kind, type: file.type, duration: 0, width: 0, height: 0, hasAudio: false, size: file.size };
  if (kind === 'video') Object.assign(base, await probeVideo(url));
  else if (kind === 'image') Object.assign(base, await probeImage(url));
  else {
    const a = document.createElement('audio');
    a.preload = 'metadata';
    a.src = url;
    await once(a, 'loadedmetadata');
    base.duration = isFinite(a.duration) ? a.duration : 0;
    base.hasAudio = true;
  }
  if (kind !== 'image' && (kind === 'audio' || base.hasAudio)) {
    const w = await waveform(file);
    if (w) {
      base.peaks = w.peaks;
      base.hasAudio = w.peaks.some((p) => p > 0.002);
      if (!base.duration) base.duration = w.duration;
    } else if (kind === 'video') base.hasAudio = false;
  }
  await putFile(id, file);
  return { media: base, url };
}

/** Recria os object URLs das mídias salvas no IndexedDB. */
export async function restoreUrls(media: Media[]) {
  const urls = new Map<string, string>();
  await Promise.all(media.map(async (m) => {
    const b = await getFile(m.id);
    if (b) urls.set(m.id, URL.createObjectURL(b));
  }));
  return urls;
}

/** Converte uma imagem (URL) em mídia, para itens vindos da biblioteca do Forma. */
export async function importBlob(blob: Blob, name: string) {
  const ext = blob.type.includes('svg') ? 'svg' : blob.type.includes('png') ? 'png' : 'jpg';
  return importFile(new File([blob], `${name}.${ext}`, { type: blob.type || 'image/png' }));
}
