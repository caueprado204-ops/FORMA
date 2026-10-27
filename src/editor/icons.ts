// Ícones Lucide (ISC, mais de 2.000). Carregado só quando o painel de elementos abre.
import { icons } from 'lucide';
import TAGS from '../data/icon-tags.json';

type Node = [string, Record<string, string | number>][];

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

export type IconEntry = { id: string; name: string; search: string };

export const ICONS: IconEntry[] = Object.keys(icons).map((k) => {
  const id = kebab(k);
  const tags = (TAGS as Record<string, string>)[id] || '';
  return { id: k, name: id.replace(/-/g, ' '), search: `${id.replace(/-/g, ' ')} ${tags}`.toLowerCase() };
});

export function iconSvg(key: string, stroke = 'currentColor', width = 2) {
  const node = (icons as unknown as Record<string, Node>)[key];
  if (!node) return '';
  const inner = node.map(([tag, attrs]) =>
    `<${tag} ${Object.entries(attrs).map(([a, v]) => `${a}="${v}"`).join(' ')}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// Busca em português: traduz termos comuns para as palavras-chave em inglês dos ícones.
const PT: Record<string, string> = {
  casa: 'home house', inicio: 'home', seta: 'arrow', setas: 'arrow', coracao: 'heart', amor: 'heart love', estrela: 'star',
  usuario: 'user person', pessoa: 'user person', pessoas: 'users people', telefone: 'phone', celular: 'smartphone phone',
  email: 'mail', 'e-mail': 'mail', mensagem: 'message chat', conversa: 'message chat', busca: 'search', buscar: 'search',
  lupa: 'search zoom', carrinho: 'shopping cart', compra: 'shopping cart bag', compras: 'shopping cart bag', loja: 'store shop',
  dinheiro: 'money dollar banknote wallet', cartao: 'credit card', presente: 'gift', calendario: 'calendar', data: 'calendar date',
  relogio: 'clock time', hora: 'clock time', tempo: 'clock timer', camera: 'camera', foto: 'image photo camera', imagem: 'image',
  video: 'video film', musica: 'music', som: 'volume speaker', fone: 'headphones', livro: 'book', escola: 'school graduation',
  educacao: 'graduation book school', saude: 'heart pulse health stethoscope', hospital: 'hospital', remedio: 'pill medicine',
  medico: 'stethoscope', comida: 'food utensils', cafe: 'coffee', pizza: 'pizza', bebida: 'drink cup glass', fruta: 'apple fruit',
  natureza: 'leaf tree flower', folha: 'leaf', arvore: 'tree', flor: 'flower', sol: 'sun', lua: 'moon', nuvem: 'cloud',
  chuva: 'rain cloud', neve: 'snow', clima: 'cloud sun weather', fogo: 'flame fire', agua: 'droplet water', montanha: 'mountain',
  viagem: 'plane travel map luggage', aviao: 'plane', carro: 'car', mapa: 'map', local: 'map pin location', localizacao: 'map pin location',
  computador: 'laptop computer monitor', tecnologia: 'cpu laptop wifi smartphone', internet: 'globe wifi', wifi: 'wifi',
  configuracao: 'settings gear', ajustes: 'settings sliders', engrenagem: 'settings cog', cadeado: 'lock', seguranca: 'shield lock',
  chave: 'key', lixo: 'trash', lixeira: 'trash', editar: 'pencil edit', lapis: 'pencil', pincel: 'brush paint', cor: 'palette',
  arquivo: 'file', pasta: 'folder', nuvemdados: 'cloud upload', download: 'download', baixar: 'download', enviar: 'send upload',
  compartilhar: 'share', link: 'link', mais: 'plus', menos: 'minus', fechar: 'x close', check: 'check', certo: 'check',
  alerta: 'alert triangle warning', informacao: 'info', ajuda: 'help circle question', notificacao: 'bell', sino: 'bell',
  trabalho: 'briefcase work', grafico: 'chart bar', negocio: 'briefcase trending chart', crescimento: 'trending up chart',
  trofeu: 'trophy award', premio: 'award trophy medal', jogo: 'gamepad game', esporte: 'dumbbell bike trophy', bicicleta: 'bike',
  animal: 'dog cat paw bird', cachorro: 'dog', gato: 'cat', passaro: 'bird', peixe: 'fish', festa: 'party popper cake',
  bolo: 'cake', aniversario: 'cake party gift', igreja: 'church', cruz: 'cross', biblia: 'book', ideia: 'lightbulb',
  lampada: 'lightbulb', foguete: 'rocket', raio: 'zap lightning', bateria: 'battery', microfone: 'mic', play: 'play',
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function searchIcons(q: string, limit = 240): IconEntry[] {
  const n = norm(q);
  if (!n) return ICONS.slice(0, limit);
  const terms = n.split(/\s+/).flatMap((w) => [w, ...(PT[w] ? PT[w].split(' ') : [])]);
  const scored: [number, IconEntry][] = [];
  for (const ic of ICONS) {
    let score = 0;
    for (const t of terms) {
      if (ic.name === t) score += 10;
      else if (ic.name.startsWith(t)) score += 5;
      else if (ic.name.includes(t)) score += 3;
      else if (ic.search.includes(t)) score += 1;
    }
    if (score) scored.push([score, ic]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map((x) => x[1]);
}

export const ICON_TOPICS: { label: string; q: string }[] = [
  { label: 'Setas', q: 'arrow' }, { label: 'Pessoas', q: 'user' }, { label: 'Comunicação', q: 'message' },
  { label: 'Compras', q: 'shopping' }, { label: 'Natureza', q: 'leaf' }, { label: 'Comida', q: 'food' },
  { label: 'Tecnologia', q: 'laptop' }, { label: 'Saúde', q: 'heart pulse' }, { label: 'Educação', q: 'book' },
  { label: 'Viagem', q: 'plane' }, { label: 'Clima', q: 'cloud' }, { label: 'Negócios', q: 'chart' },
];

export const ICON_COUNT = ICONS.length;
