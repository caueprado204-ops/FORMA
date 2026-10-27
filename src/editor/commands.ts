import type { FormaEngine, ToolId } from './engine';

export type Command = {
  id: string;
  label: string;
  menu: MenuId;
  keys?: string; // ex.: 'mod+shift+z'
  run: (e: FormaEngine, ui: UiApi) => void;
  sepBefore?: boolean;
  hidden?: boolean;
};

export type MenuId = 'arquivo' | 'editar' | 'imagem' | 'camada' | 'selecao' | 'filtro' | 'exibir' | 'ajuda';

export const MENUS: { id: MenuId; label: string }[] = [
  { id: 'arquivo', label: 'Arquivo' },
  { id: 'editar', label: 'Editar' },
  { id: 'imagem', label: 'Imagem' },
  { id: 'camada', label: 'Camada' },
  { id: 'selecao', label: 'Seleção' },
  { id: 'filtro', label: 'Filtro' },
  { id: 'exibir', label: 'Exibir' },
  { id: 'ajuda', label: 'Ajuda' },
];

export type UiApi = {
  open: (mode: 'open' | 'place') => void;
  dialog: (d: 'new' | 'export' | 'size' | 'shortcuts' | 'palette' | null) => void;
  saveProject: () => void;
  togglePanel: (p: 'right') => void;
  toggleBank: () => void;
  goHome: () => void;
};

export const TOOLS: { id: ToolId; label: string; key: string; icon: string; hint: string }[] = [
  { id: 'move', label: 'Mover', key: 'v', icon: 'move', hint: 'Selecione, mova e transforme camadas. Shift mantém proporção.' },
  { id: 'marquee', label: 'Letreiro retangular', key: 'm', icon: 'rselect', hint: 'Arraste para selecionar. Ctrl+J copia para nova camada, Delete apaga a área.' },
  { id: 'crop', label: 'Cortar', key: 'c', icon: 'rcrop', hint: 'Ajuste a moldura e pressione Enter para aplicar. Esc cancela.' },
  { id: 'eyedropper', label: 'Conta-gotas', key: 'i', icon: 'eyedropper', hint: 'Clique para pegar a cor de frente. Alt+clique define a cor de fundo.' },
  { id: 'brush', label: 'Pincel', key: 'b', icon: 'brush', hint: '[ e ] mudam o tamanho. Shift+[ e ] mudam a dureza.' },
  { id: 'eraser', label: 'Borracha', key: 'e', icon: 'eraser', hint: 'Apaga a camada selecionada. [ e ] mudam o tamanho.' },
  { id: 'gradient', label: 'Gradiente', key: 'g', icon: 'gradient', hint: 'Arraste para aplicar um gradiente da cor de frente para a de fundo.' },
  { id: 'bucket', label: 'Lata de tinta', key: 'k', icon: 'pbucket', hint: 'Clique numa forma ou texto para pintar. Clique no fundo para mudar a cor da tela.' },
  { id: 'text', label: 'Texto', key: 't', icon: 'htype', hint: 'Clique para escrever. Clique num texto para editar.' },
  { id: 'rect', label: 'Retângulo', key: 'u', icon: 'rect', hint: 'Arraste para desenhar. Shift deixa quadrado.' },
  { id: 'ellipse', label: 'Elipse', key: 'o', icon: 'ellipse', hint: 'Arraste para desenhar. Shift deixa círculo.' },
  { id: 'line', label: 'Linha', key: 'l', icon: 'line', hint: 'Arraste para desenhar. Shift trava em 45°.' },
  { id: 'hand', label: 'Mão', key: 'h', icon: 'hand', hint: 'Arraste para navegar. Segure Espaço com qualquer ferramenta.' },
  { id: 'zoom', label: 'Lupa', key: 'z', icon: 'zoom', hint: 'Clique para aproximar. Alt+clique para afastar.' },
];

export const COMMANDS: Command[] = [
  // Arquivo
  { id: 'new', label: 'Novo…', menu: 'arquivo', keys: 'mod+n', run: (_, ui) => ui.dialog('new') },
  { id: 'open', label: 'Abrir…', menu: 'arquivo', keys: 'mod+o', run: (_, ui) => ui.open('open') },
  { id: 'place', label: 'Colocar imagem…', menu: 'arquivo', keys: 'mod+shift+p', run: (_, ui) => ui.open('place') },
  { id: 'bank', label: 'Banco de imagens (Pinterest)', menu: 'arquivo', keys: 'mod+shift+o', run: (_, ui) => ui.toggleBank() },
  { id: 'save', label: 'Salvar projeto (.forma)', menu: 'arquivo', keys: 'mod+s', sepBefore: true, run: (_, ui) => ui.saveProject() },
  { id: 'export', label: 'Exportar como…', menu: 'arquivo', keys: 'mod+alt+shift+s', run: (_, ui) => ui.dialog('export') },
  { id: 'home', label: 'Voltar ao site', menu: 'arquivo', sepBefore: true, run: (_, ui) => ui.goHome() },

  // Editar
  { id: 'undo', label: 'Desfazer', menu: 'editar', keys: 'mod+z', run: (e) => e.undo() },
  { id: 'redo', label: 'Refazer', menu: 'editar', keys: 'mod+shift+z', run: (e) => e.redo() },
  { id: 'redo2', label: 'Refazer', menu: 'editar', keys: 'mod+y', hidden: true, run: (e) => e.redo() },
  { id: 'cut', label: 'Recortar', menu: 'editar', keys: 'mod+x', sepBefore: true, run: (e) => e.cut() },
  { id: 'copy', label: 'Copiar', menu: 'editar', keys: 'mod+c', run: (e) => e.copy() },
  { id: 'paste', label: 'Colar', menu: 'editar', keys: 'mod+v', run: (e) => e.paste() },
  { id: 'clear', label: 'Limpar', menu: 'editar', keys: 'delete', run: (e) => e.deleteSelected() },
  { id: 'clear2', label: 'Limpar', menu: 'editar', keys: 'backspace', hidden: true, run: (e) => e.deleteSelected() },
  { id: 'fill', label: 'Preencher com cor de frente', menu: 'editar', keys: 'alt+backspace', sepBefore: true, run: (e) => e.fillSelection(e.fg) },
  { id: 'fillbg', label: 'Preencher com cor de fundo', menu: 'editar', keys: 'mod+backspace', run: (e) => e.fillSelection(e.bg) },
  { id: 'fill2', label: 'Preencher…', menu: 'editar', keys: 'shift+f5', hidden: true, run: (e) => e.fillSelection(e.fg) },
  { id: 'transform', label: 'Transformação livre', menu: 'editar', keys: 'mod+t', sepBefore: true, run: (e) => { e.setTool('move'); if (!e.active()) e.selectAll(); } },
  { id: 'rot90', label: 'Girar camada 90° horário', menu: 'editar', run: (e) => e.rotateLayer(90) },
  { id: 'rot-90', label: 'Girar camada 90° anti-horário', menu: 'editar', run: (e) => e.rotateLayer(-90) },
  { id: 'flipx', label: 'Espelhar horizontal', menu: 'editar', run: (e) => e.flipLayer('x') },
  { id: 'flipy', label: 'Espelhar vertical', menu: 'editar', run: (e) => e.flipLayer('y') },
  { id: 'swap', label: 'Trocar cores', menu: 'editar', keys: 'x', sepBefore: true, run: (e) => e.swapColors() },
  { id: 'resetcol', label: 'Cores padrão', menu: 'editar', keys: 'd', run: (e) => e.resetColors() },

  // Imagem
  { id: 'size', label: 'Tamanho do documento…', menu: 'imagem', keys: 'mod+alt+i', run: (_, ui) => ui.dialog('size') },
  { id: 'cropsel', label: 'Cortar para a seleção', menu: 'imagem', run: (e) => e.cropToSelection() },
  { id: 'rotcw', label: 'Girar tela 90° horário', menu: 'imagem', sepBefore: true, run: (e) => e.transformCanvas('rotCW') },
  { id: 'rotccw', label: 'Girar tela 90° anti-horário', menu: 'imagem', run: (e) => e.transformCanvas('rotCCW') },
  { id: 'cflipx', label: 'Espelhar tela horizontal', menu: 'imagem', run: (e) => e.transformCanvas('flipH') },
  { id: 'cflipy', label: 'Espelhar tela vertical', menu: 'imagem', run: (e) => e.transformCanvas('flipV') },
  { id: 'bc', label: 'Brilho/Contraste', menu: 'imagem', keys: 'mod+l', sepBefore: true, run: (e) => e.quickAdjust({ contrast: 0.12, brightness: 0.04 }, 'Brilho/Contraste') },
  { id: 'hs', label: 'Matiz/Saturação: mais saturação', menu: 'imagem', keys: 'mod+u', run: (e) => e.quickAdjust({ saturation: 0.25 }, 'Matiz/Saturação') },
  { id: 'invert', label: 'Inverter', menu: 'imagem', keys: 'mod+i', run: (e) => e.quickAdjust({ invert: true }, 'Inverter') },
  { id: 'desat', label: 'Dessaturar', menu: 'imagem', keys: 'mod+shift+u', run: (e) => e.quickAdjust({ grayscale: true }, 'Dessaturar') },
  { id: 'bw', label: 'Preto e branco', menu: 'imagem', keys: 'mod+alt+shift+b', run: (e) => e.quickAdjust({ grayscale: true, contrast: 0.15 }, 'Preto e branco') },

  // Camada
  { id: 'newlayer', label: 'Nova camada', menu: 'camada', keys: 'mod+shift+n', run: (e) => e.newPaintLayer() },
  { id: 'dup', label: 'Duplicar camada', menu: 'camada', keys: 'mod+j', run: (e) => e.duplicateSelected() },
  { id: 'delete', label: 'Excluir camada', menu: 'camada', run: (e) => { e.setMarquee(null); e.deleteSelected(); } },
  { id: 'group', label: 'Agrupar camadas', menu: 'camada', keys: 'mod+g', sepBefore: true, run: (e) => e.groupSelected() },
  { id: 'ungroup', label: 'Desagrupar', menu: 'camada', keys: 'mod+shift+g', run: (e) => e.ungroupSelected() },
  { id: 'front', label: 'Trazer para frente', menu: 'camada', keys: 'mod+shift+]', sepBefore: true, run: (e) => e.arrange('top') },
  { id: 'fwd', label: 'Avançar', menu: 'camada', keys: 'mod+]', run: (e) => e.arrange('up') },
  { id: 'bwd', label: 'Recuar', menu: 'camada', keys: 'mod+[', run: (e) => e.arrange('down') },
  { id: 'back', label: 'Enviar para trás', menu: 'camada', keys: 'mod+shift+[', run: (e) => e.arrange('bottom') },
  { id: 'raster', label: 'Rasterizar camada', menu: 'camada', sepBefore: true, run: (e) => e.rasterize() },
  { id: 'mergedown', label: 'Mesclar abaixo', menu: 'camada', keys: 'mod+e', run: (e) => e.mergeDown() },
  { id: 'mergevis', label: 'Mesclar visíveis', menu: 'camada', keys: 'mod+shift+e', run: (e) => e.mergeVisible() },
  { id: 'flatten', label: 'Achatar imagem', menu: 'camada', run: (e) => e.flatten() },
  { id: 'al-l', label: 'Alinhar à esquerda', menu: 'camada', sepBefore: true, run: (e) => e.align('left') },
  { id: 'al-hc', label: 'Centralizar na horizontal', menu: 'camada', run: (e) => e.align('hcenter') },
  { id: 'al-r', label: 'Alinhar à direita', menu: 'camada', run: (e) => e.align('right') },
  { id: 'al-t', label: 'Alinhar ao topo', menu: 'camada', run: (e) => e.align('top') },
  { id: 'al-vc', label: 'Centralizar na vertical', menu: 'camada', run: (e) => e.align('vcenter') },
  { id: 'al-b', label: 'Alinhar à base', menu: 'camada', run: (e) => e.align('bottom') },

  // Seleção
  { id: 'all', label: 'Selecionar tudo', menu: 'selecao', keys: 'mod+a', run: (e) => e.selectAll() },
  { id: 'deselect', label: 'Desmarcar', menu: 'selecao', keys: 'mod+d', run: (e) => e.deselect() },
  { id: 'selcopy', label: 'Camada via cópia', menu: 'selecao', sepBefore: true, run: (e) => e.copySelectionToLayer() },
  { id: 'selclear', label: 'Apagar área selecionada', menu: 'selecao', run: (e) => e.clearInsideSelection() },

  // Filtro
  { id: 'f-blur', label: 'Desfoque', menu: 'filtro', run: (e) => e.quickAdjust({ blur: 0.15 }, 'Desfoque') },
  { id: 'f-sharp', label: 'Nitidez', menu: 'filtro', run: (e) => e.quickAdjust({ sharpen: 0.4 }, 'Nitidez') },
  { id: 'f-noise', label: 'Ruído / granulado', menu: 'filtro', run: (e) => e.quickAdjust({ noise: 60 }, 'Ruído') },
  { id: 'f-pix', label: 'Pixelizar', menu: 'filtro', run: (e) => e.quickAdjust({ pixelate: 12 }, 'Pixelizar') },
  { id: 'f-vig', label: 'Vinheta', menu: 'filtro', run: (e) => e.quickAdjust({ vignette: 0.6 }, 'Vinheta') },
  { id: 'f-sepia', label: 'Sépia', menu: 'filtro', run: (e) => e.quickAdjust({ sepia: true }, 'Sépia') },

  // Exibir
  { id: 'zin', label: 'Aproximar', menu: 'exibir', keys: 'mod+=', run: (e) => e.zoomIn() },
  { id: 'zin2', label: 'Aproximar', menu: 'exibir', keys: 'mod++', hidden: true, run: (e) => e.zoomIn() },
  { id: 'zout', label: 'Afastar', menu: 'exibir', keys: 'mod+-', run: (e) => e.zoomOut() },
  { id: 'fit', label: 'Ajustar à tela', menu: 'exibir', keys: 'mod+0', run: (e) => e.fit() },
  { id: '100', label: '100%', menu: 'exibir', keys: 'mod+1', run: (e) => e.actualSize() },
  { id: '200', label: '200%', menu: 'exibir', keys: 'mod+2', run: (e) => { e.fit(); e.zoomTo(2); } },
  { id: 'panel', label: 'Mostrar/ocultar painéis', menu: 'exibir', keys: 'tab', sepBefore: true, run: (_, ui) => ui.togglePanel('right') },
  { id: 'palette', label: 'Paleta de comandos', menu: 'exibir', keys: 'mod+k', run: (_, ui) => ui.dialog('palette') },

  // Ajuda
  { id: 'shortcuts', label: 'Atalhos de teclado', menu: 'ajuda', keys: 'mod+/', run: (_, ui) => ui.dialog('shortcuts') },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function formatKeys(k?: string) {
  if (!k) return '';
  return k
    .split('+')
    .filter((p, i, arr) => !(p === '' && arr[i + 1] === ''))
    .map((p) => {
      if (p === 'mod') return isMac ? '⌘' : 'Ctrl';
      if (p === 'shift') return isMac ? '⇧' : 'Shift';
      if (p === 'alt') return isMac ? '⌥' : 'Alt';
      if (p === 'backspace') return isMac ? '⌫' : 'Backspace';
      if (p === 'delete') return 'Del';
      if (p === 'tab') return 'Tab';
      if (p === '') return '+';
      return p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1);
    })
    .join(isMac ? '' : '+');
}

/** Converte um KeyboardEvent na notação usada em `keys`. */
export function eventCombo(ev: KeyboardEvent) {
  const parts: string[] = [];
  if (ev.ctrlKey || ev.metaKey) parts.push('mod');
  if (ev.altKey) parts.push('alt');
  if (ev.shiftKey) parts.push('shift');
  let k = ev.key.toLowerCase();
  if (ev.code.startsWith('Key')) k = ev.code.slice(3).toLowerCase();
  else if (ev.code.startsWith('Digit')) k = ev.code.slice(5);
  else if (ev.code === 'BracketLeft') k = '[';
  else if (ev.code === 'BracketRight') k = ']';
  else if (ev.code === 'Equal') k = '=';
  else if (ev.code === 'Minus') k = '-';
  else if (ev.code === 'Slash') k = '/';
  else if (ev.code === 'NumpadAdd') k = '+';
  else if (ev.code === 'NumpadSubtract') k = '-';
  parts.push(k);
  return parts.join('+');
}
