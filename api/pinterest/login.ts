import { cookie, fail, redirect } from '../_lib/http.js';
import { SCOPES, config } from '../_lib/pinterest.js';

// Envia o visitante para autorizar o Forma no Pinterest.
export async function GET(req: Request) {
  const c = config(req);
  if (!c.configured) return fail('Integração do Pinterest não configurada (PINTEREST_APP_ID / PINTEREST_APP_SECRET).', 503);
  const state = crypto.randomUUID();
  const url = new URL('https://www.pinterest.com/oauth/');
  url.searchParams.set('client_id', c.id);
  url.searchParams.set('redirect_uri', c.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', state);
  return redirect(url.toString(), [cookie('pin_state', state, 600, req)]);
}
