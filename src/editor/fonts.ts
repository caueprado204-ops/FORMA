// Catálogo de fontes do Forma: Google Fonts carregadas sob demanda, fontes do sistema
// e fontes enviadas pelo usuário (guardadas no IndexedDB deste navegador).

export type FontCat = 'sans' | 'serif' | 'display' | 'script' | 'mono' | 'system' | 'custom';
export type FontDef = { family: string; cat: FontCat };

export const CATEGORIES: { id: FontCat | 'all' | 'recent'; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'recent', label: 'Recentes' },
  { id: 'sans', label: 'Sem serifa' },
  { id: 'serif', label: 'Serifa' },
  { id: 'display', label: 'Display' },
  { id: 'script', label: 'Manuscrita' },
  { id: 'mono', label: 'Mono' },
  { id: 'system', label: 'Sistema' },
  { id: 'custom', label: 'Minhas' },
];

const GOOGLE: Record<'sans' | 'serif' | 'display' | 'script' | 'mono', string[]> = {
  sans: [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Nunito Sans', 'Work Sans',
    'Rubik', 'Manrope', 'DM Sans', 'Plus Jakarta Sans', 'Outfit', 'Sora', 'Urbanist', 'Lexend', 'Figtree', 'Onest',
    'Space Grotesk', 'Archivo', 'Archivo Narrow', 'Barlow', 'Barlow Condensed', 'Barlow Semi Condensed', 'Mulish', 'Karla',
    'Quicksand', 'Josefin Sans', 'Kanit', 'Heebo', 'Fira Sans', 'Fira Sans Condensed', 'IBM Plex Sans', 'IBM Plex Sans Condensed',
    'Source Sans 3', 'Noto Sans', 'PT Sans', 'PT Sans Narrow', 'Ubuntu', 'Cabin', 'Hind', 'Titillium Web', 'Oswald', 'Exo 2',
    'Red Hat Display', 'Red Hat Text', 'Be Vietnam Pro', 'Albert Sans', 'Epilogue', 'Syne', 'Unbounded', 'Chivo',
    'Public Sans', 'Inter Tight', 'Schibsted Grotesk', 'Bricolage Grotesque', 'Instrument Sans', 'Familjen Grotesk',
    'Hanken Grotesk', 'Golos Text', 'Saira', 'Saira Condensed', 'Asap', 'Asap Condensed', 'Encode Sans', 'M PLUS Rounded 1c',
    'Varela Round', 'Comfortaa', 'Maven Pro', 'Prompt', 'Jost', 'League Spartan', 'Gothic A1', 'Signika', 'Overpass',
    'Commissioner', 'Geist', 'Libre Franklin', 'Mukta', 'Assistant', 'Catamaran', 'Dosis', 'Questrial', 'Abel',
    'Didact Gothic', 'Sarabun', 'Spline Sans', 'Readex Pro', 'Wix Madefor Display', 'Anuphan', 'Gantari', 'Kumbh Sans',
    'Mada', 'Tenor Sans', 'Montserrat Alternates', 'Raleway Dots', 'Darker Grotesque', 'Space Grotesk', 'Atkinson Hyperlegible',
  ],
  serif: [
    'Playfair Display', 'Playfair', 'Merriweather', 'Lora', 'Libre Baskerville', 'EB Garamond', 'Cormorant Garamond', 'Cormorant',
    'DM Serif Display', 'DM Serif Text', 'Crimson Text', 'Crimson Pro', 'PT Serif', 'Noto Serif', 'Noto Serif Display',
    'Source Serif 4', 'Roboto Slab', 'Zilla Slab', 'Bitter', 'Arvo', 'Spectral', 'Cardo', 'Libre Caslon Text', 'Libre Caslon Display',
    'Bodoni Moda', 'Libre Bodoni', 'Prata', 'Fraunces', 'Newsreader', 'Instrument Serif', 'Young Serif', 'Gloock',
    'Abril Fatface', 'Alegreya', 'Vollkorn', 'Old Standard TT', 'Rozha One', 'Marcellus', 'Cinzel', 'Cinzel Decorative',
    'Yeseva One', 'Rufina', 'Gilda Display', 'Italiana', 'Bellefair', 'Literata', 'Petrona', 'Brygada 1918', 'Castoro',
    'IBM Plex Serif', 'Josefin Slab', 'Domine', 'Frank Ruhl Libre', 'Amiri', 'Gelasio', 'Unna', 'Sorts Mill Goudy',
    'Rosarivo', 'Antic Didone', 'Forum', 'Della Respira', 'Noticia Text', 'Tinos', 'Slabo 27px', 'Aleo', 'Kreon',
    'Martel', 'Sumana', 'Lustria', 'Trirong', 'Hahmlet', 'Radley', 'Linden Hill', 'Junicode', 'Imbue', 'Bona Nova',
  ],
  display: [
    'Bebas Neue', 'Anton', 'Archivo Black', 'Alfa Slab One', 'Righteous', 'Lobster', 'Bungee', 'Bungee Shade', 'Bungee Inline',
    'Bungee Outline', 'Black Ops One', 'Russo One', 'Staatliches', 'Teko', 'Fjalla One', 'Passion One', 'Paytone One',
    'Titan One', 'Luckiest Guy', 'Bangers', 'Fredoka', 'Fugaz One', 'Monoton', 'Audiowide', 'Orbitron', 'Press Start 2P',
    'Rubik Mono One', 'Rubik Glitch', 'Rubik Bubbles', 'Rubik Doodle Shadow', 'Shrikhand', 'Ultra', 'Chango', 'Changa One',
    'Bowlby One', 'Bowlby One SC', 'Dela Gothic One', 'Big Shoulders Display', 'Six Caps', 'League Gothic', 'Oleo Script',
    'Concert One', 'Lilita One', 'Bagel Fat One', 'Rampart One', 'Krona One', 'Syncopate', 'Michroma', 'Major Mono Display',
    'Silkscreen', 'VT323', 'Faster One', 'Codystar', 'Megrim', 'Zen Dots', 'Poiret One', 'Limelight', 'Rye', 'Ewert',
    'Sancreek', 'Diplomata', 'Creepster', 'Nosifer', 'Eater', 'Butcherman', 'Grenze Gotisch', 'UnifrakturMaguntia',
    'Pirata One', 'New Rocker', 'Metal Mania', 'Gravitas One', 'Erica One', 'Bricolage Grotesque', 'Tilt Warp', 'Tilt Prism',
    'Climate Crisis', 'Honk', 'Nabla', 'Bungee Spice', 'Sixtyfour', 'Workbench', 'Kalnia', 'Agbalumo', 'Gasoek One',
    'Black Han Sans', 'Squada One', 'Sansita', 'Spicy Rice', 'Boogaloo', 'Sniglet', 'Baloo 2', 'Chewy', 'Carter One',
  ],
  script: [
    'Dancing Script', 'Pacifico', 'Great Vibes', 'Caveat', 'Satisfy', 'Sacramento', 'Allura', 'Alex Brush', 'Parisienne',
    'Kaushan Script', 'Yellowtail', 'Cookie', 'Courgette', 'Shadows Into Light', 'Indie Flower', 'Amatic SC', 'Permanent Marker',
    'Gloria Hallelujah', 'Patrick Hand', 'Architects Daughter', 'Kalam', 'Homemade Apple', 'Rock Salt', 'Reenie Beanie',
    'Nothing You Could Do', 'La Belle Aurore', 'Mrs Saint Delafield', 'Pinyon Script', 'Tangerine', 'Italianno',
    'Monsieur La Doulaise', 'Herr Von Muellerhoff', 'Mr Dafoe', 'Petit Formal Script', 'Marck Script', 'Damion', 'Lobster Two',
    'Leckerli One', 'Playball', 'Bad Script', 'Caveat Brush', 'Covered By Your Grace', 'Just Another Hand', 'Gochi Hand',
    'Sedgwick Ave', 'Nanum Pen Script', 'Coming Soon', 'Schoolbell', 'Short Stack', 'Handlee', 'Neucha', 'Delius',
    'Mynerve', 'Birthstone', 'Ephesis', 'Imperial Script', 'Ms Madi', 'Corinthia', 'Water Brush', 'Updock', 'Licorice',
    'Fuggles', 'WindSong', 'Island Moments', 'Bonheur Royale', 'Meow Script', 'Send Flowers', 'Oooh Baby', 'Beau Rivage',
    'Rouge Script', 'Lavishly Yours', 'Edu SA Beginner', 'Square Peg', 'Grape Nuts', 'Puppies Play',
  ],
  mono: [
    'JetBrains Mono', 'Fira Code', 'Space Mono', 'IBM Plex Mono', 'Roboto Mono', 'Source Code Pro', 'Inconsolata', 'DM Mono',
    'Courier Prime', 'Overpass Mono', 'Ubuntu Mono', 'Anonymous Pro', 'Share Tech Mono', 'Red Hat Mono', 'Martian Mono',
    'Azeret Mono', 'Geist Mono', 'Cutive Mono', 'Xanh Mono', 'Syne Mono', 'Victor Mono', 'Sono', 'Spline Sans Mono',
    'Noto Sans Mono', 'Fira Mono', 'PT Mono', 'Nova Mono', 'B612 Mono', 'Chivo Mono',
  ],
};

export const SYSTEM_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Tahoma', 'Impact'];

const seen = new Set<string>();
export const CATALOG: FontDef[] = [];
for (const [cat, list] of Object.entries(GOOGLE) as [FontCat, string[]][]) {
  for (const family of list) {
    if (seen.has(family)) continue;
    seen.add(family);
    CATALOG.push({ family, cat });
  }
}
for (const family of SYSTEM_FONTS) CATALOG.push({ family, cat: 'system' });

const GOOGLE_SET = new Set(CATALOG.filter((f) => f.cat !== 'system').map((f) => f.family));
const SYSTEM_SET = new Set(SYSTEM_FONTS);

// ───────────────────────── carregamento ─────────────────────────
const full = new Map<string, Promise<boolean>>();
const preview = new Set<string>();
const custom = new Set<string>();
const listeners = new Set<() => void>();

export function onFontsChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
const changed = () => listeners.forEach((l) => l());

function addStylesheet(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve(true);
    link.onerror = () => { link.remove(); resolve(false); };
    document.head.appendChild(link);
  });
}

const enc = (family: string) => encodeURIComponent(family).replace(/%20/g, '+');

export function isLoaded(family: string) {
  return SYSTEM_SET.has(family) || custom.has(family) || full.has(family);
}

/**
 * Carrega a família completa do Google Fonts. Tenta pedir regular, negrito e itálico;
 * como o Google recusa o pedido inteiro quando a fonte não tem um desses estilos,
 * cai para um pedido menor até achar o que a fonte oferece.
 */
export function loadFamily(family: string): Promise<boolean> {
  if (SYSTEM_SET.has(family) || custom.has(family)) return Promise.resolve(true);
  if (!GOOGLE_SET.has(family)) return Promise.resolve(false);
  let p = full.get(family);
  if (!p) {
    p = (async () => {
      for (const axes of ['ital,wght@0,400;0,700;1,400;1,700', 'wght@400;700', '']) {
        const ok = await addStylesheet(`https://fonts.googleapis.com/css2?family=${enc(family)}${axes ? `:${axes}` : ''}&display=swap`);
        if (ok) return true;
      }
      return false;
    })();
    full.set(family, p);
  }
  return p;
}

/** Garante que a fonte esteja pronta para o canvas desenhar com ela. */
export async function ensureFont(family: string, weight: string | number = '400', style = 'normal') {
  if (!family) return;
  await loadFamily(family);
  try {
    await document.fonts.load(`${style} ${weight} 48px "${family}"`);
  } catch { /* fonte indisponível: o navegador usa a substituta */ }
}

/** Baixa só as letras do nome da fonte, para a lista de prévia (poucos KB). */
export function loadPreview(family: string) {
  if (isLoaded(family) || preview.has(family) || !GOOGLE_SET.has(family)) return;
  preview.add(family);
  addStylesheet(`https://fonts.googleapis.com/css2?family=${enc(family)}&text=${encodeURIComponent(family)}&display=swap`);
}

// ───────────────────────── recentes ─────────────────────────
const RECENT_KEY = 'forma.fonts.recent';
export function recentFonts(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
export function pushRecent(family: string) {
  try {
    const list = [family, ...recentFonts().filter((f) => f !== family)].slice(0, 10);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* armazenamento indisponível */ }
}

// ───────────────────────── fontes enviadas ─────────────────────────
const DB = 'forma-fonts';
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fonts');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export function customFonts(): string[] {
  return [...custom].sort((a, b) => a.localeCompare(b));
}

async function register(name: string, buf: ArrayBuffer) {
  const face = new FontFace(name, buf);
  await face.load();
  document.fonts.add(face);
  custom.add(name);
}

export async function addCustomFont(file: File): Promise<string> {
  if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('Use um arquivo .ttf, .otf, .woff ou .woff2');
  const buf = await file.arrayBuffer();
  const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Minha fonte';
  try { await register(name, buf.slice(0)); } catch { throw new Error('Não consegui ler esse arquivo de fonte'); }
  try {
    const d = await db();
    d.transaction('fonts', 'readwrite').objectStore('fonts').put(buf, name);
  } catch { /* fica só nesta sessão */ }
  changed();
  return name;
}

export async function removeCustomFont(name: string) {
  custom.delete(name);
  document.fonts.forEach((f) => { if (f.family.replace(/"/g, '') === name) document.fonts.delete(f); });
  try { (await db()).transaction('fonts', 'readwrite').objectStore('fonts').delete(name); } catch { /* ignora */ }
  changed();
}

let restored: Promise<void> | null = null;
export function restoreCustomFonts() {
  if (!restored) {
    restored = (async () => {
      try {
        const d = await db();
        const store = d.transaction('fonts').objectStore('fonts');
        const [keys, vals] = await Promise.all([
          new Promise<IDBValidKey[]>((r) => { const q = store.getAllKeys(); q.onsuccess = () => r(q.result); q.onerror = () => r([]); }),
          new Promise<ArrayBuffer[]>((r) => { const q = store.getAll(); q.onsuccess = () => r(q.result); q.onerror = () => r([]); }),
        ]);
        await Promise.all(keys.map((k, i) => register(String(k), vals[i]).catch(() => {})));
        changed();
      } catch { /* IndexedDB indisponível */ }
    })();
  }
  return restored;
}

export function categoryOf(family: string): FontCat | null {
  if (custom.has(family)) return 'custom';
  return CATALOG.find((f) => f.family === family)?.cat || null;
}

export const FONT_COUNT = CATALOG.length;
