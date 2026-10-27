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
- **Mais de 370 fontes** do Google Fonts, carregadas só quando usadas: busca, categorias (sem serifa, serifa, display, manuscrita, mono), recentes e prévia ao passar o mouse. Também dá para **enviar fontes próprias** (.ttf, .otf, .woff, .woff2), que ficam salvas no navegador
- **Atalhos** no padrão Photoshop e paleta de comandos (`Ctrl+K`)
- **Banco de imagens** (`Ctrl+Shift+O`, ou o ícone de imagens na barra de ferramentas):
  - **Pinterest**: suas pastas, seus pins recentes e busca nos seus pins, depois de conectar a conta
  - **Link de pin**: cole qualquer link `pinterest.com/pin/…` ou `pin.it/…`; funciona sem login
  - **Banco livre**: fotos Creative Commons do Flickr e da Wikimedia (via Openverse) que permitem edição e uso comercial; o autor e a licença vão no nome da camada

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173 (as funções de /api rodam junto)
npm run build      # gera dist/
```

## Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório.
2. A Vercel detecta Vite sozinha (há um `vercel.json`). Clique em **Deploy**.
3. A partir daí, cada push na `main` publica uma versão nova.

O editor funciona sem nenhuma variável de ambiente. Só a conexão com a conta do Pinterest precisa das duas abaixo.

### Ligar o Pinterest

1. Entre em [developers.pinterest.com/apps](https://developers.pinterest.com/apps/) com a conta do Pinterest e crie um app (o Pinterest pede uma conta comercial, que é gratuita).
2. Em **Redirect URIs**, adicione exatamente `https://SEU-DOMINIO.vercel.app/api/pinterest/callback`.
3. Copie o **App ID** e o **App secret key**.
4. Na Vercel, em **Settings → Environment Variables**, crie:
   - `PINTEREST_APP_ID` = App ID
   - `PINTEREST_APP_SECRET` = App secret key
   - `PINTEREST_REDIRECT_URI` (opcional) = a mesma URL do passo 2, se usar domínio próprio
5. Faça um novo deploy. No editor, abra o banco de imagens e clique em **Conectar Pinterest**.

Apps novos começam com **acesso de teste** (Trial): só a conta dona do app e as que você adicionar como testadoras conseguem conectar. Para liberar para qualquer pessoa, peça o acesso padrão (Standard) no painel do app.

O login fica em cookies `HttpOnly` no navegador de cada pessoa; o token nunca chega ao JavaScript da página.

## Estrutura

```
api/                       # funções da Vercel
├── pinterest/             # login, callback, me, logout, boards, pins, pin (link)
├── stock.ts               # banco livre (Openverse)
├── img.ts                 # proxy de imagens (só hosts permitidos) para o canvas poder exportar
└── _lib/                  # código compartilhado (não vira rota)
src/
├── landing/Landing.tsx    # landing page
├── editor/
│   ├── engine.ts          # motor sobre o Fabric.js: camadas, ferramentas, histórico, exportação
│   ├── commands.ts        # menus, atalhos e paleta de comandos (uma lista só)
│   ├── lut.ts             # filtros próprios: LUT 3D, vinheta, temperatura
│   ├── ImageBank.tsx      # gaveta do banco de imagens
│   ├── fonts.ts           # catálogo de fontes e carregamento sob demanda
│   ├── FontPicker.tsx     # seletor de fontes
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
