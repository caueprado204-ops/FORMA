import { clearCookie, json } from '../_lib/http.js';
import { TOKEN_COOKIES } from '../_lib/pinterest.js';

export async function GET(req: Request) {
  const h = new Headers();
  TOKEN_COOKIES.forEach((n) => h.append('set-cookie', clearCookie(n, req)));
  return json({ ok: true }, 200, h);
}
