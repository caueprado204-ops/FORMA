// Motor de reprodução: monta o quadro da sequência num <canvas>, sincroniza os elementos de
// vídeo/áudio com o indicador e mistura o som pelo WebAudio (medidores e exportação).
import {
  type Clip, type Media, type Sequence, type Track, type Transition, clipsAt, end, mediaTime, progress, valueAt,
} from './model';
import { store } from './store';
import fixWebmDuration from 'fix-webm-duration';

type Source = { el: HTMLVideoElement | HTMLAudioElement; gain?: GainNode; pan?: StereoPannerNode; media: string };

const images = new Map<string, HTMLImageElement>();
function imageFor(url: string) {
  let img = images.get(url);
  if (!img) { img = new Image(); img.src = url; img.onload = () => engine.requestDraw(); images.set(url, img); }
  return img;
}

const dbToGain = (db: number) => (db <= -60 ? 0 : Math.pow(10, db / 20));

export class VideoEngine {
  canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private sources = new Map<string, Source>(); // por clipe
  private raf = 0;
  private clockStart = 0;
  private frameAtStart = 0;
  ac: AudioContext | null = null;
  master: GainNode | null = null;
  analysers: [AnalyserNode, AnalyserNode] | null = null;
  exportDest: MediaStreamAudioDestinationNode | null = null;
  private drawQueued = false;
  private scratch = document.createElement('canvas');

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.resize();
    this.requestDraw();
  }

  resize() {
    if (!this.canvas) return;
    const { width, height } = store.seq;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width; this.canvas.height = height;
    }
  }

  // ───────── áudio ─────────
  private ensureAudio() {
    if (this.ac) return this.ac;
    const ac = new AudioContext({ latencyHint: 'playback' });
    const master = ac.createGain();
    const split = ac.createChannelSplitter(2);
    const l = ac.createAnalyser(), r = ac.createAnalyser();
    l.fftSize = r.fftSize = 1024;
    master.connect(ac.destination);
    master.connect(split);
    split.connect(l, 0); split.connect(r, 1);
    this.ac = ac; this.master = master; this.analysers = [l, r];
    this.exportDest = ac.createMediaStreamDestination();
    master.connect(this.exportDest);
    // elementos criados antes do primeiro play passam pelo WebAudio agora
    for (const s of this.sources.values()) this.wire(s);
    return ac;
  }

  private wire(s: Source) {
    if (!this.ac || s.gain) return;
    try {
      const node = this.ac.createMediaElementSource(s.el);
      s.gain = this.ac.createGain();
      s.pan = this.ac.createStereoPanner();
      node.connect(s.gain).connect(s.pan).connect(this.master!);
      s.el.muted = false;
    } catch { /* elemento já ligado */ }
  }

  /** Nível de cada canal (0..1) para os medidores. */
  levels(): [number, number] {
    if (!this.analysers || !this.playing) return [0, 0];
    const out: number[] = [];
    const buf = new Float32Array(1024);
    for (const a of this.analysers) {
      a.getFloatTimeDomainData(buf);
      let p = 0;
      for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
      out.push(p);
    }
    return [out[0], out[1]];
  }

  // ───────── fontes de mídia por clipe ─────────
  private sourceFor(c: Clip, m: Media): Source | null {
    const url = store.urls.get(m.id);
    if (!url) return null;
    let s = this.sources.get(c.id);
    if (s && s.media === m.id) return s;
    const el = c.kind === 'audio' ? document.createElement('audio') : document.createElement('video');
    el.src = url;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    (el as HTMLVideoElement).playsInline = true;
    (el as any).preservesPitch = true;
    el.muted = !this.ac; // sem WebAudio ainda: fica mudo até o primeiro play
    el.addEventListener('seeked', () => this.requestDraw());
    el.addEventListener('loadeddata', () => this.requestDraw());
    s = { el, media: m.id };
    this.sources.set(c.id, s);
    if (this.ac) this.wire(s);
    return s;
  }

  /** Remove elementos de clipes que não existem mais. */
  gc() {
    const ids = new Set(store.seq.tracks.flatMap((t) => t.clips.map((c) => c.id)));
    for (const [id, s] of this.sources) {
      if (!ids.has(id)) { s.el.pause(); s.el.removeAttribute('src'); s.el.load(); s.gain?.disconnect(); this.sources.delete(id); }
    }
  }

  // ───────── reprodução ─────────
  get playing() { return store.playing; }

  play() {
    const ac = this.ensureAudio();
    ac.resume();
    const dur = store.duration;
    if (store.playhead >= dur - 1) store.playhead = store.seq.inPoint ?? 0;
    store.playing = true;
    this.clockStart = performance.now();
    this.frameAtStart = store.playhead;
    store.emit();
    this.tick();
  }

  pause() {
    store.playing = false;
    cancelAnimationFrame(this.raf);
    for (const s of this.sources.values()) s.el.pause();
    store.emit();
    this.sync(true);
  }

  toggle() { if (store.playing) this.pause(); else this.play(); }

  private tick = () => {
    if (!store.playing) return;
    const fps = store.seq.fps;
    const f = this.frameAtStart + ((performance.now() - this.clockStart) / 1000) * fps;
    const stop = store.seq.outPoint ?? store.duration;
    if (f >= stop) {
      if (store.loop) { this.frameAtStart = store.seq.inPoint ?? 0; this.clockStart = performance.now(); }
      else { store.playhead = stop; this.pause(); this.onEnded?.(); return; }
    }
    const nf = Math.floor(f);
    if (nf !== store.playhead) { store.playhead = nf; store.emit(); }
    this.sync(false, f);
    this.draw(f);
    this.raf = requestAnimationFrame(this.tick);
  };

  onEnded: (() => void) | null = null;

  /** Ajusta cada elemento de mídia para o tempo atual. */
  sync(exact: boolean, at = store.playhead) {
    const seq = store.seq;
    const active = new Set<string>();
    const anySolo = seq.tracks.some((t) => t.kind === 'audio' && t.solo);
    for (const t of seq.tracks) {
      for (const c of this.visibleClips(t, at)) {
        if (!c.media) continue;
        const m = store.media.get(c.media);
        if (!m || m.kind === 'image') continue;
        const s = this.sourceFor(c, m);
        if (!s) continue;
        active.add(c.id);
        const target = Math.max(0, Math.min(m.duration - 0.03, mediaTime(c, at, seq.fps)));
        s.el.playbackRate = Math.min(16, Math.max(0.0625, c.speed));
        // volume: vídeo com áudio vinculado fica mudo (o som sai pelo clipe de áudio)
        const linkedAudio = c.kind === 'video' && seq.tracks.some((tt) => tt.kind === 'audio' && tt.clips.some((x) => x.link && x.link === c.link));
        const trackOff = t.kind === 'audio' ? t.muted || (anySolo && !t.solo) : !m.hasAudio || linkedAudio || t.hidden;
        let vol = 0;
        if (!trackOff && !c.muted) {
          const rel = at - c.start;
          vol = dbToGain(valueAt(c.volume, rel) + (t.kind === 'audio' ? t.volume : 0));
          if (c.fadeIn && rel < c.fadeIn) vol *= Math.max(0, rel / c.fadeIn);
          if (c.fadeOut && end(c) - at < c.fadeOut) vol *= Math.max(0, (end(c) - at) / c.fadeOut);
          // transições de vídeo também cruzam o som
          vol *= this.transitionGain(t, c, at);
        }
        if (s.gain) s.gain.gain.setTargetAtTime(vol, this.ac!.currentTime, 0.015);
        else s.el.volume = Math.min(1, vol);
        const drift = Math.abs(s.el.currentTime - target);
        if (store.playing) {
          if (drift > 0.25 || s.el.paused) {
            if (drift > 0.08) s.el.currentTime = target;
            s.el.play().catch(() => {});
          }
        } else {
          if (!s.el.paused) s.el.pause();
          if (exact ? drift > 0.001 : drift > 0.04) s.el.currentTime = target;
        }
      }
    }
    for (const [id, s] of this.sources) if (!active.has(id) && !s.el.paused) s.el.pause();
  }

  private transitionGain(t: Track, c: Clip, f: number) {
    for (const tr of t.transitions) {
      if (f < tr.start || f >= tr.start + tr.duration) continue;
      const p = progress(tr, f);
      if (tr.to === c.id && tr.from !== c.id) return p;
      if (tr.from === c.id && tr.to !== c.id) return 1 - p;
    }
    return 1;
  }

  /** Clipes que aparecem em `f` numa trilha, incluindo os que estão "estendidos" por uma transição. */
  private visibleClips(t: Track, f: number): Clip[] {
    const out = clipsAt(t, Math.floor(f));
    for (const tr of t.transitions) {
      if (f < tr.start || f >= tr.start + tr.duration) continue;
      for (const id of [tr.from, tr.to]) {
        if (!id || out.some((c) => c.id === id)) continue;
        const c = t.clips.find((x) => x.id === id);
        if (c?.enabled) out.push(c);
      }
    }
    return out;
  }

  // ───────── desenho ─────────
  requestDraw() {
    if (this.drawQueued || store.playing) return;
    this.drawQueued = true;
    requestAnimationFrame(() => { this.drawQueued = false; this.draw(store.playhead); });
  }

  draw(f: number, target?: CanvasRenderingContext2D) {
    const ctx = target || this.ctx;
    if (!ctx) return;
    const seq = store.seq;
    const W = seq.width, H = seq.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = seq.bg;
    ctx.fillRect(0, 0, W, H);
    // V1 embaixo: percorre as trilhas de vídeo de baixo para cima
    const vTracks = seq.tracks.filter((t) => t.kind === 'video' && !t.hidden).reverse();
    for (const t of vTracks) {
      const clips = this.visibleClips(t, f).sort((a, b) => {
        // na transição cruzada, quem sai é desenhado primeiro
        const tr = t.transitions.find((x) => x.from === a.id && x.to === b.id);
        if (tr) return -1;
        const tr2 = t.transitions.find((x) => x.from === b.id && x.to === a.id);
        if (tr2) return 1;
        return a.start - b.start;
      });
      for (const c of clips) this.drawClip(ctx, t, c, f);
      // mergulhos no preto/branco desenham por cima do corte
      for (const tr of t.transitions) {
        if (f < tr.start || f >= tr.start + tr.duration || (tr.type !== 'dip-black' && tr.type !== 'dip-white')) continue;
        const p = progress(tr, f);
        const a = tr.from && tr.to ? 1 - Math.abs(p * 2 - 1) : tr.to ? 1 - p : p;
        ctx.globalAlpha = a; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
        ctx.fillStyle = tr.type === 'dip-black' ? '#000' : '#fff';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  private transitionFor(t: Track, c: Clip, f: number): { tr: Transition; p: number; role: 'in' | 'out' } | null {
    for (const tr of t.transitions) {
      if (f < tr.start || f >= tr.start + tr.duration) continue;
      if (tr.to === c.id) return { tr, p: progress(tr, f), role: 'in' };
      if (tr.from === c.id) return { tr, p: progress(tr, f), role: 'out' };
    }
    return null;
  }

  private drawClip(ctx: CanvasRenderingContext2D, t: Track, c: Clip, f: number) {
    const seq = store.seq;
    const W = seq.width, H = seq.height;
    const rel = f - c.start;
    let src: CanvasImageSource | null = null, sw = W, sh = H;
    const m = c.media ? store.media.get(c.media) : undefined;
    if (c.kind === 'video' && m) {
      const s = this.sourceFor(c, m);
      const v = s?.el as HTMLVideoElement | undefined;
      if (v && v.readyState >= 2) { src = v; sw = v.videoWidth; sh = v.videoHeight; }
      else if (v && !store.playing) { const target = Math.max(0, mediaTime(c, f, seq.fps)); if (Math.abs(v.currentTime - target) > 0.04) v.currentTime = target; }
    } else if (c.kind === 'image' && m) {
      const url = store.urls.get(m.id);
      if (url) { const img = imageFor(url); if (img.complete && img.naturalWidth) { src = img; sw = img.naturalWidth; sh = img.naturalHeight; } }
    } else if (c.kind === 'title' || c.kind === 'color') {
      src = this.renderGenerated(c);
      sw = W; sh = H;
    }
    if (!src) return;

    const tf = c.transform;
    let x = valueAt(tf.x, rel), y = valueAt(tf.y, rel);
    let scale = valueAt(tf.scale, rel) / 100;
    const rot = (valueAt(tf.rotation, rel) * Math.PI) / 180;
    let alpha = Math.max(0, Math.min(1, valueAt(tf.opacity, rel) / 100));
    let extraBlur = 0;
    let clip: [number, number, number, number] | null = null;

    const tr = this.transitionFor(t, c, f);
    if (tr) {
      const { p, role } = tr;
      const k = role === 'in' ? p : 1 - p;
      switch (tr.tr.type) {
        case 'dissolve': if (tr.tr.from && tr.tr.to ? role === 'in' : true) alpha *= k; break;
        case 'dip-black': case 'dip-white':
          if (tr.tr.from && tr.tr.to) { if ((role === 'in' && p < 0.5) || (role === 'out' && p >= 0.5)) alpha = 0; }
          break;
        case 'wipe-left': if (role === 'in') clip = [W * (1 - p), 0, W * p, H]; break;
        case 'wipe-right': if (role === 'in') clip = [0, 0, W * p, H]; break;
        case 'slide-left': x += role === 'in' ? W * (1 - p) : -W * p; break;
        case 'slide-up': y += role === 'in' ? H * (1 - p) : -H * p; break;
        case 'zoom': if (role === 'in') { scale *= 0.6 + 0.4 * p; alpha *= p; } else { scale *= 1 + 0.3 * p; alpha *= tr.tr.to ? 1 : 1 - p; } break;
        case 'blur': extraBlur = 40 * (role === 'in' ? 1 - p : p); if (role === 'in' && tr.tr.from) alpha *= p; else if (!tr.tr.to || !tr.tr.from) alpha *= k; break;
      }
    }
    if (alpha <= 0.001) return;

    // ajuste ao quadro (como "Ajustar ao tamanho do quadro")
    const fit = c.kind === 'title' || c.kind === 'color' ? 1 : Math.min(W / sw, H / sh);
    const dw = sw * fit * scale, dh = sh * fit * scale;

    ctx.save();
    if (clip) { ctx.beginPath(); ctx.rect(...clip); ctx.clip(); }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = c.blend || 'source-over';
    ctx.filter = this.filterFor(c, extraBlur);
    ctx.translate(W / 2 + x, H / 2 + y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
    if (c.fx.vignette > 0) {
      ctx.filter = 'none';
      const g = ctx.createRadialGradient(0, 0, Math.min(dw, dh) * 0.25, 0, 0, Math.hypot(dw, dh) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, c.fx.vignette)})`);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = g;
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    }
    if (c.fx.temperature) {
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = alpha * Math.min(1, Math.abs(c.fx.temperature)) * 0.6;
      ctx.fillStyle = c.fx.temperature > 0 ? '#ff9a3c' : '#3c8cff';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();
  }

  private filterFor(c: Clip, extraBlur: number) {
    const fx = c.fx;
    const parts: string[] = [];
    if (fx.brightness) parts.push(`brightness(${(1 + fx.brightness).toFixed(3)})`);
    if (fx.contrast) parts.push(`contrast(${(1 + fx.contrast).toFixed(3)})`);
    if (fx.saturation) parts.push(`saturate(${Math.max(0, 1 + fx.saturation).toFixed(3)})`);
    if (fx.hue) parts.push(`hue-rotate(${Math.round(fx.hue)}deg)`);
    if (fx.grayscale) parts.push('grayscale(1)');
    if (fx.sepia) parts.push('sepia(1)');
    if (fx.invert) parts.push('invert(1)');
    const blur = fx.blur + extraBlur;
    if (blur > 0.1) parts.push(`blur(${blur.toFixed(1)}px)`);
    return parts.length ? parts.join(' ') : 'none';
  }

  private genCache = new Map<string, { key: string; canvas: HTMLCanvasElement }>();
  /** Títulos e fundos de cor viram uma imagem do tamanho do quadro (com cache). */
  private renderGenerated(c: Clip) {
    const seq = store.seq;
    const key = JSON.stringify([c.kind, c.title, c.color, seq.width, seq.height]);
    const hit = this.genCache.get(c.id);
    if (hit && hit.key === key) return hit.canvas;
    const cv = hit?.canvas || document.createElement('canvas');
    cv.width = seq.width; cv.height = seq.height;
    const x = cv.getContext('2d')!;
    x.clearRect(0, 0, cv.width, cv.height);
    if (c.kind === 'color') {
      x.fillStyle = c.color || '#7c5cff';
      x.fillRect(0, 0, cv.width, cv.height);
    } else if (c.title) {
      const t = c.title;
      x.font = `${t.weight} ${t.size}px "${t.font}", Inter, sans-serif`;
      x.textAlign = t.align;
      x.textBaseline = 'middle';
      const lines = t.text.split('\n');
      const lh = t.size * 1.15;
      const ax = t.align === 'left' ? cv.width * 0.08 : t.align === 'right' ? cv.width * 0.92 : cv.width / 2;
      const y0 = cv.height / 2 - ((lines.length - 1) * lh) / 2;
      if (t.bg) {
        const w = Math.max(...lines.map((l) => x.measureText(l).width)) + t.size * 0.8;
        const h = lines.length * lh + t.size * 0.5;
        const bx = t.align === 'left' ? ax - t.size * 0.4 : t.align === 'right' ? ax - w + t.size * 0.4 : ax - w / 2;
        x.fillStyle = t.bg;
        x.beginPath();
        x.roundRect(bx, cv.height / 2 - h / 2, w, h, t.size * 0.18);
        x.fill();
      }
      if (t.shadow) { x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = t.size * 0.25; x.shadowOffsetY = t.size * 0.06; }
      lines.forEach((l, i) => {
        if (t.stroke > 0) { x.lineWidth = t.stroke; x.strokeStyle = t.strokeColor; x.lineJoin = 'round'; x.strokeText(l, ax, y0 + i * lh); }
        x.fillStyle = t.color;
        x.fillText(l, ax, y0 + i * lh);
      });
    }
    this.genCache.set(c.id, { key, canvas: cv });
    return cv;
  }

  /** Quadro atual como imagem (para miniatura do monitor ou "exportar quadro"). */
  snapshot(f = store.playhead, type = 'image/png') {
    const seq = store.seq;
    this.scratch.width = seq.width; this.scratch.height = seq.height;
    this.draw(f, this.scratch.getContext('2d')!);
    return this.scratch.toDataURL(type, 0.92);
  }

  // ───────── exportação ─────────
  exporting = false;

  static exportFormats() {
    const list = [
      { mime: 'video/mp4;codecs=avc1.640028,mp4a.40.2', ext: 'mp4', label: 'MP4 (H.264 + AAC)' },
      { mime: 'video/webm;codecs=vp9,opus', ext: 'webm', label: 'WebM (VP9 + Opus)' },
      { mime: 'video/webm;codecs=vp8,opus', ext: 'webm', label: 'WebM (VP8 + Opus)' },
      { mime: 'video/webm', ext: 'webm', label: 'WebM' },
    ];
    return list.filter((f) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(f.mime));
  }

  /** Grava a sequência em tempo real (canvas + mixagem de áudio) com MediaRecorder. */
  async export(opts: { mime: string; bitrate: number; from: number; to: number; onProgress: (p: number) => void; signal: AbortSignal }): Promise<Blob> {
    if (!this.canvas) throw new Error('monitor indisponível');
    this.ensureAudio();
    await this.ac!.resume();
    this.pause();
    store.seek(opts.from);
    this.sync(true);
    await new Promise((r) => setTimeout(r, 400));
    const fps = store.seq.fps;
    const stream = new MediaStream([
      ...this.canvas.captureStream(fps).getVideoTracks(),
      ...this.exportDest!.stream.getAudioTracks(),
    ]);
    const rec = new MediaRecorder(stream, { mimeType: opts.mime, videoBitsPerSecond: opts.bitrate, audioBitsPerSecond: 192000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: opts.mime.split(';')[0] })); });
    const prevOut = store.seq.outPoint, prevLoop = store.loop;
    store.loop = false;
    store.seq = { ...store.seq, outPoint: opts.to };
    this.exporting = true;
    // sem som nas caixas durante a exportação; a gravação recebe a mixagem completa
    this.master!.disconnect(this.ac!.destination);
    rec.start(500);
    const prog = setInterval(() => opts.onProgress((store.playhead - opts.from) / Math.max(1, opts.to - opts.from)), 200);
    const finished = new Promise<void>((res) => { this.onEnded = () => res(); });
    opts.signal.addEventListener('abort', () => this.pause());
    this.play();
    await Promise.race([finished, new Promise<void>((res) => opts.signal.addEventListener('abort', () => res()))]);
    clearInterval(prog);
    this.onEnded = null;
    rec.stop();
    this.master!.connect(this.ac!.destination);
    store.seq = { ...store.seq, outPoint: prevOut };
    store.loop = prevLoop;
    this.exporting = false;
    stream.getTracks().forEach((t) => { if (t.kind === 'video') t.stop(); });
    if (opts.signal.aborted) throw new Error('cancelado');
    opts.onProgress(1);
    const blob = await done;
    // o MediaRecorder não grava a duração no WebM; sem ela os players não deixam avançar o vídeo
    if (blob.type.includes('webm')) {
      try { return await fixWebmDuration(blob, ((opts.to - opts.from) / fps) * 1000, { logger: false }); } catch { /* entrega sem a correção */ }
    }
    return blob;
  }
}

export const engine = new VideoEngine();
(window as any).formaVideoEngine = engine;
