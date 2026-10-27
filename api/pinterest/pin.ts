import { type BankImage, fail, json } from '../_lib/http.js';

// Importa um pin público a partir do link, sem login (oEmbed do Pinterest).
const PIN_HOST = /(^|\.)pinterest\.[a-z.]+$|^pin\.it$/;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('url')?.trim() || '';
  let link: URL;
  try { link = new URL(raw.startsWith('http') ? raw : `https://${raw}`); } catch { return fail('Cole um link de pin do Pinterest'); }
  if (!PIN_HOST.test(link.hostname)) return fail('Esse link não é do Pinterest');
  // links curtos pin.it redirecionam para o pin completo
  if (link.hostname === 'pin.it') {
    const r = await fetch(link, { redirect: 'follow' }).catch(() => null);
    if (!r) return fail('Não consegui abrir esse link', 502);
    link = new URL(r.url);
    if (!PIN_HOST.test(link.hostname)) return fail('Esse link não leva a um pin');
  }
  const m = link.pathname.match(/\/pin\/(?:[^/]*--)?(\d+)/);
  if (!m) return fail('Use o link de um pin (pinterest.com/pin/…)');
  const pinUrl = `https://www.pinterest.com/pin/${m[1]}/`;
  const r = await fetch(`https://www.pinterest.com/oembed.json?url=${encodeURIComponent(pinUrl)}`).catch(() => null);
  if (!r || !r.ok) return fail('Pin não encontrado ou privado', 404);
  const d = await r.json();
  if (!d.thumbnail_url) return fail('Esse pin não tem imagem', 404);
  const thumb: string = d.thumbnail_url;
  const image: BankImage = {
    id: m[1],
    title: d.title || 'Pin',
    thumb,
    full: thumb.replace(/\/(\d+x\d*|originals)\//, '/736x/'),
    author: d.author_name,
    link: pinUrl,
    source: 'pinterest',
  };
  return json({ image }, 200, { 'cache-control': 'public, s-maxage=86400' });
}
