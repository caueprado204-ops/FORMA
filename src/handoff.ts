// Passa a arte entre o editor Forma e o modo Pro sem recarregar a página.
type Handoff = { blob: Blob; name?: string };
let pending: Handoff | null = null;
export const setHandoff = (h: Handoff) => { pending = h; };
export const takeHandoff = () => { const h = pending; pending = null; return h; };
