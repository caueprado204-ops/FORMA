import { type BankImage, cookie, readCookies } from './http.js';

export const PIN_API = 'https://api.pinterest.com/v5';
export const SCOPES = 'boards:read,pins:read,user_accounts:read';
const AT = 'pin_at';
const RT = 'pin_rt';

export function config(req: Request) {
  const id = process.env.PINTEREST_APP_ID || '';
  const secret = process.env.PINTEREST_APP_SECRET || '';
  const redirectUri = process.env.PINTEREST_REDIRECT_URI || `${new URL(req.url).origin}/api/pinterest/callback`;
  return { id, secret, redirectUri, configured: !!(id && secret) };
}

function basic(id: string, secret: string) {
  return 'Basic ' + btoa(`${id}:${secret}`);
}

export type Tokens = { access_token: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number };

export async function tokenRequest(req: Request, body: Record<string, string>): Promise<Tokens> {
  const c = config(req);
  const r = await fetch(`${PIN_API}/oauth/token`, {
    method: 'POST',
    headers: { authorization: basic(c.id, c.secret), 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.access_token) throw new Error(data.message || `Pinterest recusou o login (${r.status})`);
  return data as Tokens;
}

export function tokenCookies(t: Tokens, req: Request) {
  const out = [cookie(AT, t.access_token, Math.max(60, (t.expires_in || 2592000) - 60), req)];
  if (t.refresh_token) out.push(cookie(RT, t.refresh_token, t.refresh_token_expires_in || 60 * 60 * 24 * 365, req));
  return out;
}

export const TOKEN_COOKIES = [AT, RT];

/**
 * Chama a API do Pinterest com o token do visitante. Se o token expirou e há refresh,
 * renova uma vez e devolve os cookies novos para a resposta.
 */
export async function pinterest(req: Request, path: string): Promise<{ status: number; data: any; setCookies: string[] }> {
  const jar = readCookies(req);
  let token = jar[AT];
  const setCookies: string[] = [];
  if (!token && jar[RT]) {
    const t = await tokenRequest(req, { grant_type: 'refresh_token', refresh_token: jar[RT] }).catch(() => null);
    if (t) { token = t.access_token; setCookies.push(...tokenCookies(t, req)); }
  }
  if (!token) return { status: 401, data: { error: 'Conecte sua conta do Pinterest' }, setCookies };
  const call = (tk: string) => fetch(`${PIN_API}${path}`, { headers: { authorization: `Bearer ${tk}` } });
  let r = await call(token);
  if (r.status === 401 && jar[RT] && !setCookies.length) {
    const t = await tokenRequest(req, { grant_type: 'refresh_token', refresh_token: jar[RT] }).catch(() => null);
    if (t) { setCookies.push(...tokenCookies(t, req)); r = await call(t.access_token); }
  }
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data, setCookies };
}

const SIZE_ORDER = ['originals', '1200x', '736x', '600x', '400x300', '236x', '150x150'];

export function pinToImage(p: any): BankImage | null {
  const imgs = p?.media?.images || {};
  const pick = (order: string[]) => order.map((k) => imgs[k]).find((v) => v?.url);
  const full = pick(SIZE_ORDER);
  const thumb = pick(['600x', '400x300', '736x', '236x', '1200x', 'originals', '150x150']);
  const cover = p?.media?.cover_image_url; // pins de vídeo
  const fullUrl = full?.url || cover;
  if (!fullUrl) return null;
  return {
    id: String(p.id),
    title: p.title || p.alt_text || p.description || 'Pin',
    thumb: thumb?.url || fullUrl,
    full: fullUrl,
    width: full?.width,
    height: full?.height,
    link: p.id ? `https://www.pinterest.com/pin/${p.id}/` : undefined,
    source: 'pinterest',
  };
}
