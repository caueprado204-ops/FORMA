import { allowedImageUrl, fail } from './_lib/http.js';

// Proxy de imagens: devolve a imagem pela mesma origem do site, para o canvas poder
// editar e exportar sem bloqueio de CORS. Só aceita hosts conhecidos (ver IMAGE_HOSTS).
const MAX = 25 * 1024 * 1024;

export async function GET(req: Request) {
  const src = allowedImageUrl(new URL(req.url).searchParams.get('u'));
  if (!src) return fail('Imagem de origem não permitida', 403);
  const r = await fetch(src, { redirect: 'follow', headers: { 'user-agent': 'FormaStudio/2.0' } }).catch(() => null);
  if (!r || !r.ok) return fail('Não foi possível baixar a imagem', 502);
  if (!allowedImageUrl(r.url)) return fail('Imagem de origem não permitida', 403);
  const type = r.headers.get('content-type') || '';
  if (!type.startsWith('image/')) return fail('O link não é uma imagem', 415);
  const len = Number(r.headers.get('content-length') || 0);
  if (len > MAX) return fail('Imagem grande demais', 413);
  const body = await r.arrayBuffer();
  if (body.byteLength > MAX) return fail('Imagem grande demais', 413);
  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=86400, s-maxage=604800, immutable',
      // o modo Pro (Photopea, em outro domínio) baixa as imagens por aqui
      'access-control-allow-origin': '*',
    },
  });
}
