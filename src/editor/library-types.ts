/** Onde a biblioteca coloca o que o usuário escolhe: no editor Forma ou no Photopea (modo Pro). */
export type Inserter = {
  image: (url: string, name: string, client?: { x: number; y: number }) => Promise<void> | void;
  /** `svg` já vem com `currentColor`; quem insere aplica a cor. */
  element: (svg: string, name: string, opts?: { client?: { x: number; y: number }; gradient?: { stops: string[]; angle: number } }) => Promise<void> | void;
  /** Cor usada nas prévias e na inserção. */
  color: string;
  setColor?: (c: string) => void;
  /** Arrastar até a tela só funciona no editor Forma (o iframe do Photopea não recebe o arraste). */
  canDrag: boolean;
};

export const BANK_MIME = 'application/x-forma-image';
export const ELEMENT_MIME = 'application/x-forma-element';
