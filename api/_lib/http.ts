// Utilitários das funções da Vercel (pastas que começam com _ não viram rotas).

export type BankImage = {
  id: string;
  title: string;
  thumb: string; // para exibir na grade (carrega direto do host)
  full: string; // URL original; o editor baixa pelo /api/img
  width?: number;
  height?: number;
  author?: string;
  license?: string;
  link?: string;
  source: 'pinterest' | 'livre';
};

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  const h = new Headers(headers);
  h.set('content-type', 'application/json; charset=utf-8');
  if (!h.has('cache-control')) h.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { status, headers: h });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

export function readCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name: string, value: string, maxAgeSec: number, req: Request) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearCookie(name: string, req: Request) {
  return cookie(name, '', 0, req);
}

export function redirect(location: string, setCookies: string[] = []) {
  const h = new Headers({ location, 'cache-control': 'no-store' });
  setCookies.forEach((c) => h.append('set-cookie', c));
  return new Response(null, { status: 302, headers: h });
}

/** Hosts de imagem que o proxy aceita. Mantém o /api/img longe de virar proxy aberto. */
export const IMAGE_HOSTS = [
  /^i\.pinimg\.com$/,
  /^([a-z0-9-]+\.)?staticflickr\.com$/,
  /^upload\.wikimedia\.org$/,
  /^api\.openverse\.org$/,
  /^api\.openverse\.engineering$/,
];

export function allowedImageUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    return IMAGE_HOSTS.some((re) => re.test(u.hostname)) ? u : null;
  } catch {
    return null;
  }
}
