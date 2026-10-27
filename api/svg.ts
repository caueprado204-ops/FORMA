import { fail } from './_lib/http.js';

// Entrega um elemento do banco (SVG) por URL para o modo Pro (Photopea) abrir com app.open().
// O SVG vem no parâmetro `d` (base64url). Respondemos com CSP sandbox para que nenhum script rode,
// mesmo se alguém abrir o endereço direto no navegador.
const MAX = 200 * 1024;

function fromB64url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return new TextDecoder().decode(Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0)));
}

export async function GET(req: Request) {
  const d = new URL(req.url).searchParams.get('d') || '';
  if (!d || d.length > MAX * 1.4) return fail('Elemento inválido');
  let svgText: string;
  try { svgText = fromB64url(d); } catch { return fail('Elemento inválido'); }
  if (!/^\s*<svg[\s>]/i.test(svgText) || /<script|\son\w+\s*=|javascript:/i.test(svgText)) return fail('Elemento inválido');
  return new Response(svgText, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'x-content-type-options': 'nosniff',
    },
  });
}
