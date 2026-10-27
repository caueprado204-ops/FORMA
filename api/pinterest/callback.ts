import { clearCookie, readCookies, redirect } from '../_lib/http.js';
import { config, tokenCookies, tokenRequest } from '../_lib/pinterest.js';

// O Pinterest volta para cá com ?code=…&state=…
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (status: string, extra: string[] = []) =>
    redirect(`/?pinterest=${status}#/editor`, [clearCookie('pin_state', req), ...extra]);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code) return back('cancelado');
  if (!state || state !== readCookies(req).pin_state) return back('erro');
  try {
    const t = await tokenRequest(req, { grant_type: 'authorization_code', code, redirect_uri: config(req).redirectUri });
    return back('conectado', tokenCookies(t, req));
  } catch {
    return back('erro');
  }
}
