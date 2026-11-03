// Baixa as versões web (WebAssembly) dos apps da suíte e coloca em dist/apps/<id>/.
// Roda no fim do build (na Vercel). Usa os pacotes oficiais publicados nos releases de cada
// repositório: <repo>-web-<versão>.zip. Se um app falhar, os outros continuam e o app aparece
// como indisponível no hub.
//
// Variáveis opcionais:
//   SKIP_APPS=1          não baixa nada (builds locais rápidos)
//   APPS_ONLY=foto,pdf   baixa só esses
//   GITHUB_TOKEN         evita o limite da API do GitHub ao descobrir a versão mais nova
//   APPS_SOURCE_DIR      pasta com zips já baixados (<repo>-web-<ver>.zip), útil para testes

import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'apps');
const catalog = JSON.parse(await readFile(join(root, 'src/apps/catalog.json'), 'utf8'));

if (process.env.SKIP_APPS === '1') {
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'manifest.json'), JSON.stringify({ builtAt: new Date().toISOString(), apps: {} }));
  console.log('[apps] SKIP_APPS=1: nenhum app baixado');
  process.exit(0);
}

const only = (process.env.APPS_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const headers = { 'user-agent': 'forma-studio-build', accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function latestWebAsset(repo) {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=8`, { headers });
    if (!r.ok) return null;
    for (const rel of await r.json()) {
      if (rel.draft) continue;
      const a = (rel.assets || []).find((x) => /-web-[^/]+\.zip$/.test(x.name));
      if (a) return { url: a.browser_download_url, version: rel.tag_name.replace(/^v/, ''), size: a.size };
    }
  } catch { /* sem rede ou limite da API */ }
  return null;
}

async function download(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': headers['user-agent'] }, redirect: 'follow' });
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
      if (r.status === 404) throw new Error('404');
    } catch (e) {
      if (String(e.message) === '404' || i === tries) throw e;
    }
    await new Promise((res) => setTimeout(res, 1500 * i));
  }
  throw new Error('falhou');
}

async function getZip(app) {
  const [, name] = app.repo.split('/');
  if (process.env.APPS_SOURCE_DIR) {
    const files = existsSync(process.env.APPS_SOURCE_DIR) ? await readdir(process.env.APPS_SOURCE_DIR) : [];
    const f = files.find((x) => x.startsWith(`${name}-web-`) && x.endsWith('.zip'));
    if (!f) throw new Error('zip local não encontrado');
    return { bytes: new Uint8Array(await readFile(join(process.env.APPS_SOURCE_DIR, f))), version: f.slice(name.length + 5, -4) };
  }
  const latest = await latestWebAsset(app.repo);
  if (latest) {
    try { return { bytes: await download(latest.url), version: latest.version }; } catch { /* tenta a versão fixa */ }
  }
  const url = `https://github.com/${app.repo}/releases/download/v${app.version}/${name}-web-${app.version}.zip`;
  return { bytes: await download(url), version: app.version };
}

/** Extrai o zip; o site fica na pasta que tem o index.html (normalmente <repo>-web-<ver>/). */
async function extract(bytes, dest) {
  const files = unzipSync(bytes);
  const index = Object.keys(files).filter((p) => /(^|\/)index\.html$/.test(p)).sort((a, b) => a.length - b.length)[0];
  if (!index) throw new Error('o pacote não tem index.html');
  const base = index.slice(0, -'index.html'.length);
  await rm(dest, { recursive: true, force: true });
  let count = 0, total = 0;
  for (const [p, data] of Object.entries(files)) {
    if (!p.startsWith(base) || p.endsWith('/')) continue;
    const rel = p.slice(base.length);
    if (!rel || rel.includes('..')) continue;
    const target = join(dest, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    count++; total += data.length;
  }
  return { count, total };
}

const manifest = { builtAt: new Date().toISOString(), apps: {} };
const list = catalog.apps.filter((a) => !only.length || only.includes(a.id));
let ok = 0;

// dois por vez: rápido sem estourar a memória do build
for (let i = 0; i < list.length; i += 2) {
  await Promise.all(list.slice(i, i + 2).map(async (app) => {
    const t = Date.now();
    try {
      const { bytes, version } = await getZip(app);
      const { count, total } = await extract(bytes, join(out, app.id));
      manifest.apps[app.id] = { available: true, version, bytes: total };
      ok++;
      console.log(`[apps] ${app.name} ${version}: ${count} arquivos, ${(total / 1048576).toFixed(1)} MB (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    } catch (e) {
      manifest.apps[app.id] = { available: false, error: String(e.message || e) };
      console.warn(`[apps] ${app.name}: indisponível (${e.message || e})`);
    }
  }));
}

await mkdir(out, { recursive: true });
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[apps] ${ok}/${list.length} apps prontos em ${relative(root, out)}/`);
