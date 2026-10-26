# Forma Studio

Editor de imagens no navegador, no estilo Photoshop, com interface própria da Forma. Inclui a landing page (`/`) e o editor (`/#/editor`).

## O que tem

- **14 ferramentas**: Mover, Letreiro, Cortar, Conta-gotas, Pincel, Borracha, Gradiente, Lata de tinta, Texto, Retângulo, Elipse, Linha, Mão e Lupa
- **Camadas**: arrastar para reordenar, visibilidade, bloqueio, renomear, agrupar, duplicar, mesclar abaixo/visíveis, achatar, 16 modos de mesclagem e opacidade
- **Ajustes ao vivo** em imagens: exposição, brilho, contraste, saturação, vibração, temperatura, matiz, nitidez, desfoque, granulado, vinheta, P&B, sépia, inverter
- **18 looks de cinema** (LUTs 3D) com prévia na própria foto e intensidade ajustável
- **Seleção retangular**: copiar para nova camada, apagar a área, preencher, cortar
- **Histórico** com desfazer/refazer e painel de estados
- **Exportação** PNG/JPG/WEBP em 0.5x–3x; projeto salvo como `.forma`; salvamento automático no navegador
- **Atalhos** no padrão Photoshop e paleta de comandos (`Ctrl+K`)

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
```

## Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório.
2. A Vercel detecta Vite sozinha (há um `vercel.json`). Clique em **Deploy**.
3. A partir daí, cada push na `main` publica uma versão nova.

Não há variáveis de ambiente: tudo roda no navegador.

## Estrutura

```
src/
├── landing/Landing.tsx    # landing page
├── editor/
│   ├── engine.ts          # motor sobre o Fabric.js: camadas, ferramentas, histórico, exportação
│   ├── commands.ts        # menus, atalhos e paleta de comandos (uma lista só)
│   ├── lut.ts             # filtros próprios: LUT 3D, vinheta, temperatura
│   ├── panels.tsx         # Propriedades, Ajustes, Cor, Camadas, Histórico
│   ├── Editor.tsx         # layout, barras, diálogos
│   └── ui.tsx             # controles (sliders, campos, seletor de cor)
├── data/luts.ts           # LUTs reamostrados para 17³
└── assets/tools/          # ícones das ferramentas
```

## Créditos

- [Fabric.js](https://fabricjs.com) — motor de canvas (MIT)
- [PhotoSplice](https://github.com/eolix/PhotoSplice) / [PhotoCraft](https://github.com/storytold/photocraft) (MIT/Apache-2.0) — de onde vêm:
  - ícones das ferramentas: [Tabler Icons](https://tabler.io/icons), MIT (`src/assets/tools/LICENSE-tabler.txt`)
  - LUTs de cor: [Fresh LUTs](https://freshluts.com), CC0, reamostrados para 17×17×17
  - referência de conjunto de ferramentas, atalhos e organização dos painéis
