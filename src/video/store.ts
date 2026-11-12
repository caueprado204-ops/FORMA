import { useSyncExternalStore } from 'react';
import { type Edit, type Media, type Project, type Sequence, newSequence, seqDuration } from './model';

// Estado do editor de vídeo: sequência com histórico, mídias, seleção, indicador de reprodução.

type HistoryEntry = { label: string; seq: Sequence };

export type Tool = 'select' | 'razor' | 'hand';

class VideoStore {
  seq: Sequence = newSequence();
  media = new Map<string, Media>();
  urls = new Map<string, string>(); // id da mídia → object URL
  history: HistoryEntry[] = [{ label: 'Nova sequência', seq: this.seq }];
  hIndex = 0;
  selection: string[] = [];
  selTransition: string | null = null;
  playhead = 0;
  playing = false;
  zoom = 6; // pixels por quadro
  tool: Tool = 'select';
  snap = true;
  loop = false;
  toast: { msg: string; at: number } | null = null;
  version = 0;
  private listeners = new Set<() => void>();
  private queued = false;

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  getVersion = () => this.version;

  emit() {
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.version++;
      this.listeners.forEach((l) => l());
    });
  }

  notify(msg: string) { this.toast = { msg, at: Date.now() }; this.emit(); }

  get duration() { return seqDuration(this.seq); }

  /** Aplica uma edição e grava no histórico. */
  apply(e: Edit | null, label: string) {
    if (!e) return;
    this.seq = e.seq;
    if (e.select) this.selection = e.select;
    this.history = this.history.slice(0, this.hIndex + 1);
    this.history.push({ label, seq: this.seq });
    if (this.history.length > 120) this.history.shift();
    this.hIndex = this.history.length - 1;
    this.save();
    this.emit();
  }

  /** Mudança contínua (arrastando um controle): só grava no histórico com `commit`. */
  live(seq: Sequence) { this.seq = seq; this.emit(); }
  commit(label: string) {
    const last = this.history[this.hIndex];
    if (last && last.seq === this.seq) return;
    this.apply({ seq: this.seq }, label);
  }

  undo() { if (this.hIndex > 0) { this.hIndex--; this.seq = this.history[this.hIndex].seq; this.cleanSel(); this.save(); this.emit(); } }
  redo() { if (this.hIndex < this.history.length - 1) { this.hIndex++; this.seq = this.history[this.hIndex].seq; this.cleanSel(); this.save(); this.emit(); } }

  private cleanSel() {
    const ids = new Set(this.seq.tracks.flatMap((t) => t.clips.map((c) => c.id)));
    this.selection = this.selection.filter((id) => ids.has(id));
  }

  select(ids: string[]) { this.selection = ids; this.selTransition = null; this.emit(); }
  selectTransition(id: string | null) { this.selTransition = id; if (id) this.selection = []; this.emit(); }

  seek(f: number) {
    const max = Math.max(this.duration, 0);
    this.playhead = Math.max(0, Math.min(Math.round(f), Math.max(max, Math.round(f))));
    this.emit();
  }

  setZoom(z: number) { this.zoom = Math.min(60, Math.max(0.05, z)); this.emit(); }

  // ───────── persistência ─────────
  private saveT = 0;
  save() {
    clearTimeout(this.saveT);
    this.saveT = window.setTimeout(() => {
      try {
        const p: Project = { version: 1, seq: this.seq, media: [...this.media.values()] };
        localStorage.setItem('forma.video.project', JSON.stringify(p));
      } catch { /* sem espaço */ }
    }, 800);
  }

  static saved(): Project | null {
    try { const raw = localStorage.getItem('forma.video.project'); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  load(p: Project, urls: Map<string, string>) {
    this.seq = p.seq;
    this.media = new Map(p.media.map((m) => [m.id, m]));
    this.urls = urls;
    this.history = [{ label: 'Abrir projeto', seq: this.seq }];
    this.hIndex = 0;
    this.selection = [];
    this.playhead = 0;
    this.emit();
  }

  reset(seq: Sequence) {
    this.seq = seq;
    this.history = [{ label: 'Nova sequência', seq }];
    this.hIndex = 0;
    this.selection = [];
    this.playhead = 0;
    this.save();
    this.emit();
  }
}

export const store = new VideoStore();
export const savedProject = () => VideoStore.saved();
(window as any).formaVideo = store;

export function useStore() {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
