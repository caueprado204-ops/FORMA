import { Images, Shapes, X, BookImage } from 'lucide-react';
import { ImagesTab } from './ImageBank';
import { ElementsPanel } from './ElementsPanel';
import type { Inserter } from './library-types';

export type LibraryTab = 'imagens' | 'elementos';

/** Gaveta da biblioteca: banco de imagens e banco de elementos. */
export function Library({ ins, tab, onTab, onClose }: { ins: Inserter; tab: LibraryTab; onTab: (t: LibraryTab) => void; onClose: () => void }) {
  return (
    <aside className="bank" aria-label="Biblioteca">
      <header className="bank-head">
        <BookImage size={16} />
        <h3>Biblioteca</h3>
        <button className="iconbtn" onClick={onClose} aria-label="Fechar biblioteca"><X size={15} /></button>
      </header>
      <nav className="lib-tabs">
        <button className={tab === 'imagens' ? 'on' : ''} onClick={() => onTab('imagens')}><Images size={15} />Imagens</button>
        <button className={tab === 'elementos' ? 'on' : ''} onClick={() => onTab('elementos')}><Shapes size={15} />Elementos</button>
      </nav>
      <p className="bank-hint">{ins.canDrag ? 'Clique para colocar no centro ou arraste até a tela.' : 'Clique para colocar no documento aberto.'}</p>
      {tab === 'imagens' ? <ImagesTab ins={ins} /> : <ElementsPanel ins={ins} />}
    </aside>
  );
}
