import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Images, Link2, LogOut, Pin, Search, X, Loader, CloudOff, Plus } from 'lucide-react';
import type { FormaEngine } from './engine';

export type BankImage = {
  id: string; title: string; thumb: string; full: string; width?: number; height?: number;
  author?: string; license?: string; link?: string; source: 'pinterest' | 'livre';
};
type Board = { id: string; name: string; count: number | null; cover: string | null };
type Me = { configured: boolean; connected: boolean; user?: { username: string; avatar?: string; name: string } };

export const BANK_MIME = 'application/x-forma-image';

async function api<T>(path: string): Promise<T> {
  const r = await fetch(path, { credentials: 'same-origin' });
  const type = r.headers.get('content-type') || '';
  if (!type.includes('json')) throw new Error('offline');
  const d = await r.json();
  if (!r.ok) throw Object.assign(new Error(d.error || 'Erro'), { status: r.status });
  return d as T;
}

function layerName(img: BankImage) {
  const base = img.title?.trim() || 'Imagem';
  if (img.source === 'livre' && img.author) return `${base} — ${img.author} (${img.license || 'CC'})`;
  return base;
}

// ───────────────────────── grade de imagens ─────────────────────────
function Grid({ images, e, loading, onMore, more }: { images: BankImage[]; e: FormaEngine; loading: boolean; onMore?: () => void; more: boolean }) {
  const place = (img: BankImage) => e.placeRemote(img.full, layerName(img));
  return (
    <>
      <div className="bank-grid">
        {images.map((img) => (
          <figure key={`${img.source}-${img.id}`} className="bank-item"
            draggable
            onDragStart={(ev) => {
              ev.dataTransfer.setData(BANK_MIME, JSON.stringify({ url: img.full, name: layerName(img) }));
              ev.dataTransfer.effectAllowed = 'copy';
            }}>
            <button className="bank-img" onClick={() => place(img)} aria-label={`Colocar “${img.title}” na tela`}
              style={img.width && img.height ? { aspectRatio: `${img.width}/${img.height}` } : undefined}>
              <img src={img.thumb} alt={img.title} loading="lazy" referrerPolicy="no-referrer"
                onError={(ev) => { (ev.currentTarget.closest('.bank-item') as HTMLElement).style.display = 'none'; }} />
              <span className="bank-add"><Plus size={14} />Colocar</span>
            </button>
            <figcaption>
              <span className="ellip">{img.author ? `${img.author}` : img.title}</span>
              {img.license && <span className="bank-lic">{img.license}</span>}
              {img.link && <a href={img.link} target="_blank" rel="noreferrer" aria-label="Abrir original"><ExternalLink size={11} /></a>}
            </figcaption>
          </figure>
        ))}
      </div>
      {loading && <div className="bank-state"><Loader size={16} className="spin" />Carregando…</div>}
      {!loading && more && onMore && <button className="btn ghost sm block" onClick={onMore}>Carregar mais</button>}
    </>
  );
}

// ───────────────────────── colar link de pin ─────────────────────────
function PinLink({ e }: { e: FormaEngine }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    if (!v.trim()) return;
    setBusy(true); setErr('');
    try {
      const { image } = await api<{ image: BankImage }>(`/api/pinterest/pin?url=${encodeURIComponent(v.trim())}`);
      await e.placeRemote(image.full, layerName(image));
      setV('');
    } catch (x: any) {
      setErr(x.message === 'offline' ? 'Disponível na versão publicada do site.' : x.message);
    }
    setBusy(false);
  };
  return (
    <div className="bank-link">
      <label className="lbl" htmlFor="bank-pin-url">Colar link de um pin</label>
      <div className="bank-search">
        <Link2 size={14} />
        <input id="bank-pin-url" placeholder="pinterest.com/pin/… ou pin.it/…" value={v}
          onChange={(ev) => setV(ev.target.value)}
          onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') go(); }} />
        <button className="btn primary sm" onClick={go} disabled={busy}>{busy ? <Loader size={13} className="spin" /> : 'Colocar'}</button>
      </div>
      {err && <p className="bank-err">{err}</p>}
    </div>
  );
}

// ───────────────────────── aba Pinterest ─────────────────────────
function PinterestTab({ e }: { e: FormaEngine }) {
  const [me, setMe] = useState<Me | null>(null);
  const [offline, setOffline] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<string>(''); // '' = recentes
  const [q, setQ] = useState('');
  const [images, setImages] = useState<BankImage[]>([]);
  const [bookmark, setBookmark] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api<Me>('/api/pinterest/me').then(setMe).catch(() => setOffline(true));
  }, []);

  const load = useCallback(async (opts: { board?: string; q?: string; more?: string | null } = {}) => {
    setLoading(true); setErr('');
    const qs = new URLSearchParams();
    if (opts.board) qs.set('board', opts.board);
    else if (opts.q) qs.set('q', opts.q);
    if (opts.more) qs.set('bookmark', opts.more);
    try {
      const d = await api<{ images: BankImage[]; bookmark: string | null }>(`/api/pinterest/pins?${qs}`);
      setImages((cur) => (opts.more ? [...cur, ...d.images] : d.images));
      setBookmark(d.bookmark);
    } catch (x: any) {
      setErr(x.message);
      if (!opts.more) setImages([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!me?.connected) return;
    api<{ boards: Board[] }>('/api/pinterest/boards').then((d) => setBoards(d.boards)).catch(() => {});
    load();
  }, [me?.connected, load]);

  if (offline) {
    return (
      <div className="bank-body">
        <div className="bank-state col"><CloudOff size={22} /><b>Banco de imagens fora do ar aqui</b><span>Ele usa as funções do servidor. Abra a versão publicada na Vercel para conectar o Pinterest.</span></div>
      </div>
    );
  }
  if (!me) return <div className="bank-body"><div className="bank-state"><Loader size={16} className="spin" />Verificando conexão…</div></div>;

  return (
    <div className="bank-body">
      {!me.connected && (
        <div className="bank-connect">
          <span className="bank-connect-ico"><Pin size={18} /></span>
          <div>
            <b>Suas pastas do Pinterest aqui dentro</b>
            <p>Conecte sua conta para navegar pelas suas pastas e pins e colocar qualquer um na tela.</p>
            {me.configured ? (
              <a className="btn lime sm" href="/api/pinterest/login">Conectar Pinterest</a>
            ) : (
              <p className="bank-err">A integração ainda não foi configurada neste site. Veja o passo a passo no README do projeto.</p>
            )}
          </div>
        </div>
      )}

      {me.connected && (
        <>
          <div className="bank-user">
            {me.user?.avatar ? <img src={me.user.avatar} alt="" referrerPolicy="no-referrer" /> : <span className="bank-avatar"><Pin size={12} /></span>}
            <span className="ellip">@{me.user?.username}</span>
            <button className="link" onClick={async () => { await fetch('/api/pinterest/logout'); setMe({ ...me, connected: false }); setImages([]); setBoards([]); }}>
              <LogOut size={11} /> Sair
            </button>
          </div>
          <div className="bank-search">
            <Search size={14} />
            <input id="bank-pin-q" placeholder="Buscar nos seus pins" value={q} onChange={(ev) => setQ(ev.target.value)}
              onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter') { setBoard(''); load({ q }); } }} />
            {q && <button className="iconbtn" onClick={() => { setQ(''); load({ board }); }} aria-label="Limpar busca"><X size={13} /></button>}
          </div>
          <div className="bank-boards">
            <button className={`bank-board ${!board && !q ? 'on' : ''}`} onClick={() => { setBoard(''); setQ(''); load(); }}>
              <span className="bank-board-cover all"><Images size={14} /></span>Recentes
            </button>
            {boards.map((b) => (
              <button key={b.id} className={`bank-board ${board === b.id ? 'on' : ''}`} onClick={() => { setBoard(b.id); setQ(''); load({ board: b.id }); }}>
                <span className="bank-board-cover" style={b.cover ? { backgroundImage: `url(${b.cover})` } : undefined} />
                <span className="ellip">{b.name}</span>
              </button>
            ))}
          </div>
          {err && <p className="bank-err">{err}</p>}
          {!loading && !err && !images.length && <div className="bank-state">Nenhum pin encontrado.</div>}
          <Grid images={images} e={e} loading={loading} more={!!bookmark} onMore={() => load({ board, q: board ? undefined : q, more: bookmark })} />
        </>
      )}

      <PinLink e={e} />
    </div>
  );
}

// ───────────────────────── aba Banco livre ─────────────────────────
const SUGGEST = ['Textura', 'Céu', 'Montanha', 'Flores', 'Oceano', 'Cidade', 'Abstrato', 'Folhas', 'Papel', 'Neon'];

function LivreTab({ e }: { e: FormaEngine }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('Textura');
  const [images, setImages] = useState<BankImage[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const seq = useRef(0);

  const load = useCallback(async (t: string, p = 1) => {
    const my = ++seq.current;
    setLoading(true); setErr('');
    try {
      const d = await api<{ images: BankImage[]; page: number; pages: number }>(`/api/stock?q=${encodeURIComponent(t)}&page=${p}`);
      if (my !== seq.current) return;
      setImages((cur) => (p > 1 ? [...cur, ...d.images] : d.images));
      setPage(d.page); setPages(d.pages);
    } catch (x: any) {
      if (my !== seq.current) return;
      setErr(x.message === 'offline' ? 'O banco livre funciona na versão publicada do site.' : x.message);
      if (p === 1) setImages([]);
    }
    if (my === seq.current) setLoading(false);
  }, []);

  useEffect(() => { load(term); }, [term, load]);

  return (
    <div className="bank-body">
      <div className="bank-search">
        <Search size={14} />
        <input id="bank-free-q" placeholder="Buscar fotos livres (ex.: praia, café)" value={q}
          onChange={(ev) => setQ(ev.target.value)}
          onKeyDown={(ev) => { ev.stopPropagation(); if (ev.key === 'Enter' && q.trim()) setTerm(q.trim()); }} />
      </div>
      <div className="chips bank-chips">
        {SUGGEST.map((s) => <button key={s} className={`chip ${term === s ? 'on' : ''}`} onClick={() => { setQ(''); setTerm(s); }}>{s}</button>)}
      </div>
      {err && <p className="bank-err">{err}</p>}
      {!loading && !err && !images.length && <div className="bank-state">Nada encontrado para “{term}”.</div>}
      <Grid images={images} e={e} loading={loading} more={page < pages} onMore={() => load(term, page + 1)} />
      <p className="bank-note">Fotos do Flickr e da Wikimedia com licença Creative Commons que permite editar e usar comercialmente, via Openverse. Licenças CC BY pedem crédito ao autor: o nome dele vai junto no nome da camada.</p>
    </div>
  );
}

// ───────────────────────── gaveta ─────────────────────────
export function ImageBank({ e, onClose, initialTab = 'pinterest' }: { e: FormaEngine; onClose: () => void; initialTab?: 'pinterest' | 'livre' }) {
  const [tab, setTab] = useState<'pinterest' | 'livre'>(initialTab);
  return (
    <aside className="bank" aria-label="Banco de imagens">
      <header className="bank-head">
        <Images size={16} />
        <h3>Banco de imagens</h3>
        <button className="iconbtn" onClick={onClose} aria-label="Fechar banco de imagens"><X size={15} /></button>
      </header>
      <nav className="seg bank-tabs">
        <button className={tab === 'pinterest' ? 'on' : ''} onClick={() => setTab('pinterest')}><Pin size={13} />Pinterest</button>
        <button className={tab === 'livre' ? 'on' : ''} onClick={() => setTab('livre')}><Images size={13} />Banco livre</button>
      </nav>
      <p className="bank-hint">Clique para colocar no centro ou arraste até a tela.</p>
      {tab === 'pinterest' ? <PinterestTab e={e} /> : <LivreTab e={e} />}
    </aside>
  );
}
