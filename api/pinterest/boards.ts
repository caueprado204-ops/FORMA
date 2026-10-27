import { json } from '../_lib/http.js';
import { pinterest } from '../_lib/pinterest.js';

// Pastas do visitante.
export async function GET(req: Request) {
  const r = await pinterest(req, '/boards?page_size=100');
  const h = new Headers();
  r.setCookies.forEach((s) => h.append('set-cookie', s));
  if (r.status !== 200) return json({ error: r.data?.message || r.data?.error || 'Não foi possível ler suas pastas' }, r.status, h);
  const boards = (r.data.items || []).map((b: any) => ({
    id: String(b.id),
    name: b.name,
    count: b.pin_count ?? null,
    cover: b.media?.image_cover_url || b.media?.pin_thumbnail_urls?.[0] || null,
  }));
  return json({ boards }, 200, h);
}
