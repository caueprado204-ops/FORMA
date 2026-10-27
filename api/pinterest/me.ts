import { json } from '../_lib/http.js';
import { config, pinterest } from '../_lib/pinterest.js';

// Diz ao editor se a integração está configurada e se o visitante está conectado.
export async function GET(req: Request) {
  const c = config(req);
  if (!c.configured) return json({ configured: false, connected: false });
  const r = await pinterest(req, '/user_account');
  const h = new Headers();
  r.setCookies.forEach((s) => h.append('set-cookie', s));
  if (r.status !== 200) return json({ configured: true, connected: false }, 200, h);
  return json({
    configured: true,
    connected: true,
    user: { username: r.data.username, avatar: r.data.profile_image, name: r.data.business_name || r.data.username },
  }, 200, h);
}
