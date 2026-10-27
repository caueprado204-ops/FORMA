import { type BankImage, json } from './_lib/http.js';

// Banco livre: fotos com licença Creative Commons (Openverse), sem chave de API.
const LICENSES: Record<string, string> = { cc0: 'CC0', pdm: 'Domínio público', by: 'CC BY', 'by-sa': 'CC BY-SA' };

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get('q') || '').trim().slice(0, 100) || 'textura';
  const page = Math.min(20, Math.max(1, parseInt(u.searchParams.get('page') || '1') || 1));
  const api = new URL('https://api.openverse.org/v1/images/');
  api.searchParams.set('q', q);
  api.searchParams.set('page', String(page));
  api.searchParams.set('page_size', '30');
  api.searchParams.set('source', 'flickr,wikimedia');
  api.searchParams.set('license', 'cc0,pdm,by,by-sa'); // permitem edição e uso comercial
  api.searchParams.set('mature', 'false');
  const r = await fetch(api, { headers: { 'user-agent': 'FormaStudio/2.0' } }).catch(() => null);
  if (!r || !r.ok) return json({ error: 'O banco livre não respondeu. Tente de novo em instantes.' }, 502);
  const d = await r.json();
  const images: BankImage[] = (d.results || []).map((x: any) => ({
    id: String(x.id),
    title: x.title || 'Imagem',
    thumb: x.thumbnail || x.url,
    full: x.url,
    width: x.width,
    height: x.height,
    author: x.creator || undefined,
    license: LICENSES[x.license] || (x.license || '').toUpperCase(),
    link: x.foreign_landing_url,
    source: 'livre',
  }));
  return json({ images, page, pages: Math.min(20, d.page_count || 1) }, 200, { 'cache-control': 'public, s-maxage=3600' });
}
