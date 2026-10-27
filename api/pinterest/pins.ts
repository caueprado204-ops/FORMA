import { fail, json } from '../_lib/http.js';
import { pinToImage, pinterest } from '../_lib/pinterest.js';

// ?board=ID → pins da pasta · ?q=texto → busca nos pins do visitante · sem nada → pins recentes.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const board = u.searchParams.get('board');
  const q = u.searchParams.get('q')?.trim();
  const bookmark = u.searchParams.get('bookmark');
  if (board && !/^\d+$/.test(board)) return fail('Pasta inválida');
  const qs = new URLSearchParams({ page_size: '50' });
  if (bookmark) qs.set('bookmark', bookmark);
  let path: string;
  if (board) path = `/boards/${board}/pins?${qs}`;
  else if (q) { qs.set('query', q); path = `/search/pins?${qs}`; }
  else path = `/pins?${qs}`;
  const r = await pinterest(req, path);
  const h = new Headers();
  r.setCookies.forEach((s) => h.append('set-cookie', s));
  if (r.status !== 200) return json({ error: r.data?.message || r.data?.error || 'Não foi possível carregar os pins' }, r.status, h);
  const images = (r.data.items || []).map(pinToImage).filter(Boolean);
  return json({ images, bookmark: r.data.bookmark || null }, 200, h);
}
