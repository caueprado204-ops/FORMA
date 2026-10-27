// Banco de elementos do Forma. Cada elemento é um SVG em que `currentColor` marca a cor
// que o usuário controla (vira a cor de frente ao inserir e continua editável depois).

export type ElementCat = 'formas' | 'linhas' | 'icones' | 'adesivos' | 'molduras' | 'enfeites' | 'gradientes';

export type ElementDef = {
  id: string;
  name: string;
  cat: ElementCat;
  svg: string;
  /** Gradientes viram um retângulo do tamanho do documento, atrás de tudo. */
  gradient?: { stops: string[]; angle: number };
  keywords?: string;
};

export const ELEMENT_CATS: { id: ElementCat; label: string }[] = [
  { id: 'formas', label: 'Formas' },
  { id: 'linhas', label: 'Linhas e setas' },
  { id: 'icones', label: 'Ícones' },
  { id: 'adesivos', label: 'Adesivos' },
  { id: 'molduras', label: 'Molduras' },
  { id: 'enfeites', label: 'Enfeites' },
  { id: 'gradientes', label: 'Gradientes' },
];

const svg = (vb: string, inner: string, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${inner}</svg>`;
const F = 'fill="currentColor"';
const S = (w = 4) => `fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

function poly(n: number, r = 50, cx = 50, cy = 50, rot = -90) {
  return Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}
function star(points: number, outer = 50, inner = 22, cx = 50, cy = 50) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer;
    const a = ((-90 + (180 / points) * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}
/** Forma orgânica fechada e suave (Catmull-Rom → Bézier), sempre igual para a mesma semente. */
function blob(seed: number, n = 7, cx = 50, cy = 50) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n;
    const r = 32 + rnd() * 17;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}
const sq = (inner: string) => svg('0 0 100 100', inner);

const FORMAS: Omit<ElementDef, 'cat'>[] = [
  { id: 'quadrado', name: 'Quadrado', svg: sq(`<rect width="100" height="100" ${F}/>`) },
  { id: 'arredondado', name: 'Quadrado arredondado', svg: sq(`<rect width="100" height="100" rx="20" ${F}/>`) },
  { id: 'circulo', name: 'Círculo', svg: sq(`<circle cx="50" cy="50" r="50" ${F}/>`) },
  { id: 'retangulo', name: 'Retângulo', svg: svg('0 0 160 100', `<rect width="160" height="100" ${F}/>`) },
  { id: 'pilula', name: 'Pílula', svg: svg('0 0 180 70', `<rect width="180" height="70" rx="35" ${F}/>`) },
  { id: 'triangulo', name: 'Triângulo', svg: sq(`<polygon points="50,4 100,96 0,96" ${F}/>`) },
  { id: 'triangulo-ret', name: 'Triângulo retângulo', svg: sq(`<polygon points="0,0 0,100 100,100" ${F}/>`) },
  { id: 'losango', name: 'Losango', svg: sq(`<polygon points="50,0 100,50 50,100 0,50" ${F}/>`) },
  { id: 'pentagono', name: 'Pentágono', svg: sq(`<polygon points="${poly(5)}" ${F}/>`) },
  { id: 'hexagono', name: 'Hexágono', svg: sq(`<polygon points="${poly(6, 50, 50, 50, 0)}" ${F}/>`) },
  { id: 'octogono', name: 'Octógono', svg: sq(`<polygon points="${poly(8, 50, 50, 50, -67.5)}" ${F}/>`) },
  { id: 'estrela', name: 'Estrela', svg: sq(`<polygon points="${star(5, 50, 21)}" ${F}/>`) },
  { id: 'estrela-8', name: 'Estrela de 8 pontas', svg: sq(`<polygon points="${star(8, 50, 30)}" ${F}/>`) },
  { id: 'explosao', name: 'Explosão', svg: sq(`<polygon points="${star(16, 50, 38)}" ${F}/>`) },
  { id: 'coracao', name: 'Coração', svg: sq(`<path d="M50 92 C20 70 2 52 2 32 C2 15 15 4 30 4 C40 4 47 10 50 18 C53 10 60 4 70 4 C85 4 98 15 98 32 C98 52 80 70 50 92Z" ${F}/>`) },
  { id: 'cruz', name: 'Cruz', svg: sq(`<path d="M36 0h28v36h36v28H64v36H36V64H0V36h36z" ${F}/>`) },
  { id: 'seta-bloco', name: 'Seta', svg: svg('0 0 120 80', `<path d="M0 26h72V0l48 40-48 40V54H0z" ${F}/>`) },
  { id: 'divisa', name: 'Divisa', svg: svg('0 0 80 100', `<path d="M0 0h40l40 50-40 50H0l40-50z" ${F}/>`) },
  { id: 'balao', name: 'Balão de fala', svg: svg('0 0 120 100', `<path d="M14 0h92a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14H46L22 100V80h-8A14 14 0 0 1 0 66V14A14 14 0 0 1 14 0z" ${F}/>`) },
  { id: 'nuvem', name: 'Nuvem', svg: svg('0 0 140 90', `<path d="M34 90a34 34 0 0 1-4-67.8A40 40 0 0 1 106 26a32 32 0 0 1 2 64z" ${F}/>`) },
  { id: 'lua', name: 'Lua', svg: sq(`<path d="M62 2a48 48 0 1 0 36 66A40 40 0 1 1 62 2z" ${F}/>`) },
  { id: 'semicirculo', name: 'Semicírculo', svg: svg('0 0 100 50', `<path d="M0 50a50 50 0 0 1 100 0z" ${F}/>`) },
  { id: 'quarto', name: 'Quarto de círculo', svg: sq(`<path d="M0 0a100 100 0 0 1 100 100H0z" ${F}/>`) },
  { id: 'anel', name: 'Anel', svg: sq(`<path fill-rule="evenodd" d="M50 0a50 50 0 1 1 0 100A50 50 0 0 1 50 0zm0 22a28 28 0 1 0 0 56 28 28 0 0 0 0-56z" ${F}/>`) },
  { id: 'arco', name: 'Arco', svg: svg('0 0 100 130', `<path d="M0 130V50a50 50 0 0 1 100 0v80z" ${F}/>`) },
  { id: 'paralelogramo', name: 'Paralelogramo', svg: svg('0 0 140 80', `<polygon points="30,0 140,0 110,80 0,80" ${F}/>`) },
  { id: 'trapezio', name: 'Trapézio', svg: svg('0 0 140 80', `<polygon points="30,0 110,0 140,80 0,80" ${F}/>`) },
  { id: 'gota', name: 'Gota', svg: svg('0 0 80 110', `<path d="M40 0C40 0 0 46 0 70a40 40 0 0 0 80 0C80 46 40 0 40 0z" ${F}/>`) },
  { id: 'folha', name: 'Folha', svg: sq(`<path d="M6 94C6 40 40 6 94 6c0 54-34 88-88 88z" ${F}/>`) },
  { id: 'blob-1', name: 'Forma orgânica 1', svg: sq(`<path d="${blob(11)}" ${F}/>`) },
  { id: 'blob-2', name: 'Forma orgânica 2', svg: sq(`<path d="${blob(42, 6)}" ${F}/>`) },
  { id: 'blob-3', name: 'Forma orgânica 3', svg: sq(`<path d="${blob(97, 8)}" ${F}/>`) },
  { id: 'blob-4', name: 'Forma orgânica 4', svg: sq(`<path d="${blob(2024, 5)}" ${F}/>`) },
];

const LINHAS: Omit<ElementDef, 'cat'>[] = [
  { id: 'linha', name: 'Linha', svg: svg('0 0 200 20', `<path d="M6 10h188" ${S(5)}/>`) },
  { id: 'tracejada', name: 'Linha tracejada', svg: svg('0 0 200 20', `<path d="M6 10h188" ${S(5)} stroke-dasharray="16 12"/>`) },
  { id: 'pontilhada', name: 'Linha pontilhada', svg: svg('0 0 200 20', `<path d="M6 10h188" ${S(7)} stroke-dasharray="0 14"/>`) },
  { id: 'seta-linha', name: 'Seta', svg: svg('0 0 200 40', `<path d="M6 20h184M164 6l26 14-26 14" ${S(5)}/>`) },
  { id: 'seta-dupla', name: 'Seta dupla', svg: svg('0 0 200 40', `<path d="M10 20h180M36 6 10 20l26 14M164 6l26 14-26 14" ${S(5)}/>`) },
  { id: 'seta-curva', name: 'Seta curva', svg: svg('0 0 160 100', `<path d="M8 90C20 30 80 10 140 30M120 12l22 18-26 10" ${S(5)}/>`) },
  { id: 'seta-mao', name: 'Seta desenhada', svg: svg('0 0 160 120', `<path d="M10 100c30-10 40-60 80-60 30 0 20 40 0 30-18-9 10-50 56-50M126 8l22 12-18 18" ${S(5)}/>`) },
  { id: 'zigue', name: 'Ziguezague', svg: svg('0 0 200 40', `<path d="M6 30 26 10l20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 8 8" ${S(5)}/>`) },
  { id: 'onda', name: 'Onda', svg: svg('0 0 200 40', `<path d="M6 20c16-20 32-20 48 0s32 20 48 0 32-20 48 0 32 20 44 4" ${S(5)}/>`) },
  { id: 'rabisco', name: 'Rabisco', svg: svg('0 0 200 50', `<path d="M8 30c10-20 20 10 30-6s20 12 30-4 18 14 30-2 20 10 30-6 20 12 30-4 14 8 24 0" ${S(5)}/>`) },
  { id: 'sublinhado', name: 'Sublinhado de pincel', svg: svg('0 0 220 40', `<path d="M4 22C40 8 120 6 214 12c4 1 3 8-1 8-70-2-140 2-206 14-6 1-8-9-3-12z" ${F}/>`) },
  { id: 'circulo-mao', name: 'Círculo desenhado', svg: svg('0 0 180 100', `<path d="M120 12C70 0 10 18 8 50c-2 32 60 46 110 38 40-6 60-30 50-52C158 14 110 6 70 14" ${S(4)}/>`) },
  { id: 'chave', name: 'Chave', svg: svg('0 0 40 160', `<path d="M30 6c-14 0-14 6-14 20v34c0 12-4 18-12 20 8 2 12 8 12 20v34c0 14 0 20 14 20" ${S(5)}/>`) },
  { id: 'divisor', name: 'Divisor com ponto', svg: svg('0 0 200 20', `<path d="M6 10h78M116 10h78" ${S(3)}/><circle cx="100" cy="10" r="6" ${F}/>`) },
];

const sticker = (shape: string, text: string, size = 22, vb = '0 0 120 120', ty = 60, tx = 60) =>
  svg(vb, `${shape}<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="800" font-size="${size}" fill="#ffffff">${text}</text>`);

const ADESIVOS: Omit<ElementDef, 'cat'>[] = [
  { id: 'novo', name: 'Selo Novo', svg: sticker(`<polygon points="${star(16, 60, 50, 60, 60)}" ${F}/>`, 'NOVO', 24) },
  { id: 'oferta', name: 'Etiqueta Oferta', svg: sticker(`<path d="M24 10h86a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10H24L0 40z" ${F}/><circle cx="20" cy="40" r="5" fill="#ffffff"/>`, 'OFERTA', 20, '0 0 120 80', 40, 68) },
  { id: 'desconto', name: 'Círculo -50%', svg: sticker(`<circle cx="60" cy="60" r="58" ${F}/><circle cx="60" cy="60" r="50" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 4"/>`, '-50%', 32) },
  { id: 'gratis', name: 'Faixa Grátis', svg: sticker(`<path d="M0 10h180l-14 25 14 25H0l14-25z" ${F}/>`, 'GRÁTIS', 24, '0 0 180 70', 35, 90) },
  { id: 'lancamento', name: 'Pílula Lançamento', svg: sticker(`<rect width="200" height="56" rx="28" ${F}/>`, 'LANÇAMENTO', 22, '0 0 200 56', 28, 100) },
  { id: 'sale', name: 'Selo Sale', svg: sticker(`<polygon points="${star(12, 60, 48, 60, 60)}" ${F}/>`, 'SALE', 28) },
  { id: 'top', name: 'Selo Top', svg: sticker(`<circle cx="60" cy="54" r="46" ${F}/><path d="M34 90 24 118l20-8 12 16 4-30M86 90l10 28-20-8-12 16-4-30" ${F}/>`, 'TOP', 30, '0 0 120 130', 54) },
  { id: 'uau', name: 'Balão Uau!', svg: sticker(`<path d="M60 4 72 22 94 10 92 34 116 38 98 54 114 74 90 76 92 100 72 88 60 110 48 88 28 100 30 76 6 74 22 54 4 38 28 34 26 10 48 22z" ${F}/>`, 'UAU!', 24, '0 0 120 114', 56) },
  { id: 'ate', name: 'Até 70% OFF', svg: svg('0 0 140 140', `<rect x="10" y="10" width="120" height="120" rx="16" transform="rotate(-8 70 70)" ${F}/><text x="70" y="52" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="600" font-size="16" fill="#ffffff">ATÉ</text><text x="70" y="82" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="800" font-size="40" fill="#ffffff">70%</text><text x="70" y="110" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="16" fill="#ffffff">OFF</text>`) },
  { id: 'aovivo', name: 'Ao vivo', svg: svg('0 0 150 50', `<rect width="150" height="50" rx="10" ${F}/><circle cx="26" cy="25" r="8" fill="#ffffff"/><text x="88" y="25" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="800" font-size="20" fill="#ffffff">AO VIVO</text>`) },
  { id: 'link', name: 'Link na bio', svg: svg('0 0 190 54', `<rect width="190" height="54" rx="27" fill="#ffffff"/><rect x="3" y="3" width="184" height="48" rx="24" fill="none" stroke="currentColor" stroke-width="3"/><text x="95" y="27" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="20" fill="currentColor">LINK NA BIO</text>`) },
  { id: 'arraste', name: 'Arraste para o lado', svg: svg('0 0 220 54', `<rect width="220" height="54" rx="27" ${F}/><text x="96" y="27" text-anchor="middle" dominant-baseline="central" font-family="Inter" font-weight="700" font-size="18" fill="#ffffff">ARRASTE</text><path d="M168 27h30M186 16l12 11-12 11" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`) },
];

const MOLDURAS: Omit<ElementDef, 'cat'>[] = [
  { id: 'polaroid', name: 'Polaroid', svg: svg('0 0 120 145', `<path fill-rule="evenodd" fill="#ffffff" stroke="#e4e4ec" stroke-width="1" d="M0 0h120v145H0zM10 10v100h100V10z"/>`) },
  { id: 'moldura-arred', name: 'Moldura arredondada', svg: sq(`<rect x="4" y="4" width="92" height="92" rx="14" ${S(6)}/>`) },
  { id: 'moldura-circ', name: 'Moldura circular', svg: sq(`<circle cx="50" cy="50" r="46" ${S(6)}/>`) },
  { id: 'moldura-dupla', name: 'Moldura dupla', svg: sq(`<rect x="3" y="3" width="94" height="94" ${S(3)}/><rect x="10" y="10" width="80" height="80" ${S(1.5)}/>`) },
  { id: 'moldura-cantos', name: 'Cantoneiras', svg: sq(`<path d="M4 28V4h24M72 4h24v24M96 72v24H72M28 96H4V72" ${S(5)}/>`) },
  { id: 'moldura-arco', name: 'Moldura arco', svg: svg('0 0 100 130', `<path d="M4 126V50a46 46 0 0 1 92 0v76z" ${S(5)}/>`) },
  { id: 'filme', name: 'Tira de filme', svg: svg('0 0 180 120', `<path fill-rule="evenodd" ${F} d="M0 0h180v120H0zM20 20v80h140V20zM6 6h8v8H6zM6 26h8v8H6zM6 46h8v8H6zM6 66h8v8H6zM6 86h8v8H6zM6 106h8v8H6zM166 6h8v8h-8zM166 26h8v8h-8zM166 46h8v8h-8zM166 66h8v8h-8zM166 86h8v8h-8zM166 106h8v8h-8z"/>`) },
  { id: 'celular', name: 'Celular', svg: svg('0 0 100 200', `<path fill-rule="evenodd" ${F} d="M18 0h64a18 18 0 0 1 18 18v164a18 18 0 0 1-18 18H18A18 18 0 0 1 0 182V18A18 18 0 0 1 18 0zM8 18v164a10 10 0 0 0 10 10h64a10 10 0 0 0 10-10V18A10 10 0 0 0 82 8H66a4 4 0 0 0-4 4 4 4 0 0 1-4 4H42a4 4 0 0 1-4-4 4 4 0 0 0-4-4H18A10 10 0 0 0 8 18z"/>`) },
  { id: 'navegador', name: 'Janela do navegador', svg: svg('0 0 200 140', `<path fill-rule="evenodd" ${F} d="M10 0h180a10 10 0 0 1 10 10v130H0V10A10 10 0 0 1 10 0zM6 24v110h188V24z"/><circle cx="14" cy="12" r="4" fill="#ff5f57"/><circle cx="27" cy="12" r="4" fill="#febc2e"/><circle cx="40" cy="12" r="4" fill="#28c840"/>`) },
];

const conf = ['currentColor', '#ffd84d', '#3ddc97', '#2ec5ff', '#ff5c9a', '#d4ff3a'];
const ENFEITES: Omit<ElementDef, 'cat'>[] = [
  { id: 'brilho', name: 'Brilho', svg: sq(`<path d="M50 0C54 34 66 46 100 50 66 54 54 66 50 100 46 66 34 54 0 50 34 46 46 34 50 0z" ${F}/>`) },
  { id: 'brilhos', name: 'Brilhos', svg: sq(`<path d="M38 8c3 24 11 32 35 35-24 3-32 11-35 35-3-24-11-32-35-35 24-3 32-11 35-35zM80 56c1.6 12 6 16.4 18 18-12 1.6-16.4 6-18 18-1.6-12-6-16.4-18-18 12-1.6 16.4-6 18-18zM82 2c1 8 4 11 12 12-8 1-11 4-12 12-1-8-4-11-12-12 8-1 11-4 12-12z" ${F}/>`) },
  { id: 'confete', name: 'Confete', svg: svg('0 0 140 100', [
    `<rect x="10" y="14" width="12" height="6" rx="2" transform="rotate(30 16 17)" fill="${conf[0]}"/>`,
    `<circle cx="46" cy="10" r="5" fill="${conf[1]}"/>`, `<rect x="70" y="20" width="14" height="6" rx="2" transform="rotate(-25 77 23)" fill="${conf[2]}"/>`,
    `<polygon points="108,8 118,24 98,24" fill="${conf[3]}"/>`, `<circle cx="128" cy="44" r="4" fill="${conf[4]}"/>`,
    `<rect x="24" y="52" width="14" height="6" rx="2" transform="rotate(65 31 55)" fill="${conf[5]}"/>`, `<circle cx="60" cy="62" r="6" fill="${conf[0]}"/>`,
    `<rect x="90" y="60" width="14" height="6" rx="2" transform="rotate(15 97 63)" fill="${conf[4]}"/>`, `<polygon points="14,80 24,96 4,96" fill="${conf[2]}"/>`,
    `<circle cx="116" cy="88" r="5" fill="${conf[1]}"/>`, `<rect x="52" y="86" width="12" height="6" rx="2" transform="rotate(-40 58 89)" fill="${conf[3]}"/>`,
  ].join('')) },
  { id: 'pontos', name: 'Grade de pontos', svg: sq(Array.from({ length: 25 }, (_, i) => `<circle cx="${10 + (i % 5) * 20}" cy="${10 + Math.floor(i / 5) * 20}" r="4" ${F}/>`).join('')) },
  { id: 'meio-tom', name: 'Meio-tom', svg: sq(Array.from({ length: 49 }, (_, i) => { const x = i % 7, y = Math.floor(i / 7); const r = Math.max(0.6, 6.5 - (x + y) * 0.55); return `<circle cx="${7 + x * 14.3}" cy="${7 + y * 14.3}" r="${r.toFixed(1)}" ${F}/>`; }).join('')) },
  { id: 'ondas', name: 'Ondas', svg: svg('0 0 200 80', [0, 1, 2].map((k) => `<path d="M6 ${20 + k * 20}c16-14 32-14 48 0s32 14 48 0 32-14 48 0 32 14 44 2" ${S(4)}/>`).join('')) },
  { id: 'raios', name: 'Raios de sol', svg: sq(Array.from({ length: 12 }, (_, i) => {
    const p = (deg: number) => { const r = (deg * Math.PI) / 180; return `${(50 + 50 * Math.cos(r)).toFixed(2)},${(50 + 50 * Math.sin(r)).toFixed(2)}`; };
    return `<polygon points="50,50 ${p(i * 30 - 6)} ${p(i * 30 + 6)}" ${F}/>`;
  }).join('')) },
  { id: 'circulo-tracejado', name: 'Círculo tracejado', svg: sq(`<circle cx="50" cy="50" r="44" ${S(4)} stroke-dasharray="10 8"/>`) },
  { id: 'espiral', name: 'Espiral', svg: sq(`<path d="M50 50c0-4 6-4 6 0 0 8-12 8-12 0 0-12 18-12 18 0 0 16-24 16-24 0 0-20 30-20 30 0 0 24-36 24-36 0 0-28 42-28 42 0" ${S(3.5)}/>`) },
  { id: 'flor', name: 'Flor', svg: sq(Array.from({ length: 6 }, (_, i) => `<ellipse cx="50" cy="26" rx="14" ry="24" transform="rotate(${i * 60} 50 50)" ${F}/>`).join('') + `<circle cx="50" cy="50" r="12" fill="#ffd84d"/>`) },
  { id: 'asterisco', name: 'Asterisco', svg: sq(Array.from({ length: 4 }, (_, i) => `<rect x="43" y="0" width="14" height="100" rx="7" transform="rotate(${i * 45} 50 50)" ${F}/>`).join('')) },
  { id: 'coracoes', name: 'Corações', svg: svg('0 0 120 100', `<path transform="translate(4 30) scale(.55)" d="M50 92C20 70 2 52 2 32 2 15 15 4 30 4c10 0 17 6 20 14 3-8 10-14 20-14 15 0 28 11 28 28 0 20-18 38-48 60z" ${F}/><path transform="translate(62 4) scale(.4)" d="M50 92C20 70 2 52 2 32 2 15 15 4 30 4c10 0 17 6 20 14 3-8 10-14 20-14 15 0 28 11 28 28 0 20-18 38-48 60z" ${F}/><path transform="translate(80 62) scale(.3)" d="M50 92C20 70 2 52 2 32 2 15 15 4 30 4c10 0 17 6 20 14 3-8 10-14 20-14 15 0 28 11 28 28 0 20-18 38-48 60z" ${F}/>`) },
  { id: 'cometa', name: 'Riscos de movimento', svg: svg('0 0 160 60', `<path d="M6 12h90M30 30h120M14 48h70" ${S(5)}/>`) },
];

const G: { name: string; stops: string[]; angle: number }[] = [
  { name: 'Forma', stops: ['#5b3df5', '#9b7dff', '#d4ff3a'], angle: 135 },
  { name: 'Pôr do sol', stops: ['#ff5c9a', '#ff9f43', '#ffd84d'], angle: 160 },
  { name: 'Oceano', stops: ['#0f2a5e', '#2ec5ff'], angle: 180 },
  { name: 'Aurora', stops: ['#0b3b2e', '#3ddc97', '#c6f36b'], angle: 135 },
  { name: 'Uva', stops: ['#2a1b6b', '#a259ff', '#ff6bd6'], angle: 120 },
  { name: 'Pêssego', stops: ['#ffd1b3', '#ff8a65'], angle: 135 },
  { name: 'Céu', stops: ['#a1c4fd', '#c2e9fb'], angle: 180 },
  { name: 'Noite', stops: ['#0b0b12', '#2a1b6b'], angle: 180 },
  { name: 'Menta', stops: ['#d4fc79', '#96e6a1'], angle: 120 },
  { name: 'Algodão-doce', stops: ['#fbc2eb', '#a6c1ee'], angle: 135 },
  { name: 'Fogo', stops: ['#f12711', '#f5af19'], angle: 135 },
  { name: 'Grafite', stops: ['#232526', '#5a5f6b'], angle: 135 },
];

function gradientSvg(stops: string[], angle: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(a) * 50, y = Math.sin(a) * 50;
  const st = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  return svg('0 0 100 100', `<defs><linearGradient id="g" x1="${50 - x}%" y1="${50 - y}%" x2="${50 + x}%" y2="${50 + y}%">${st}</linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>`);
}

const tag = (cat: ElementCat) => (e: Omit<ElementDef, 'cat'>): ElementDef => ({ ...e, cat });

export const ELEMENTS: ElementDef[] = [
  ...FORMAS.map(tag('formas')),
  ...LINHAS.map(tag('linhas')),
  ...ADESIVOS.map(tag('adesivos')),
  ...MOLDURAS.map(tag('molduras')),
  ...ENFEITES.map(tag('enfeites')),
  ...G.map((g, i) => ({ id: `grad-${i}`, name: `Gradiente ${g.name}`, cat: 'gradientes' as const, svg: gradientSvg(g.stops, g.angle), gradient: g })),
];

/** SVG pronto para inserir: troca currentColor pela cor escolhida. */
export function colorize(svgText: string, color: string) {
  return svgText.replace(/currentColor/g, color);
}

export function svgDataUri(svgText: string) {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
}
