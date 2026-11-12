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
- **Biblioteca** com duas abas, aberta pelos ícones na barra de ferramentas:
- **Banco de elementos** (`Ctrl+Shift+K`): formas, linhas e setas, mais de 2.000 ícones (Lucide), adesivos com texto, molduras e mockups, enfeites e gradientes. Busca em português, escolha de cor antes de inserir e, depois, cor e espessura do traço no painel Propriedades
- **Modo Pro** (`#/pro`): o editor Photopea embutido, com a mesma biblioteca ao lado. O botão **Modo Pro** leva a arte atual para lá; **Levar para o editor Forma** traz o resultado de volta; **Baixar PNG** exporta direto. O Photopea é gratuito e exibe anúncios; para removê-los é preciso uma conta de distribuidor no Photopea
- **Banco de imagens** (`Ctrl+Shift+O`):
  - **Pinterest**: suas pastas, seus pins recentes e busca nos seus pins, depois de conectar a conta
  - **Link de pin**: cole qualquer link `pinterest.com/pin/…` ou `pin.it/…`; funciona sem login
  - **Banco livre**: fotos Creative Commons do Flickr e da Wikimedia (via Openverse) que permitem edição e uso comercial; o autor e a licença vão no nome da camada

## Forma Vídeo (`#/video`)

Editor de vídeo próprio do Forma, com cara de editor profissional:

- **Projeto:** importe vídeo, áudio e imagens (arrastar ou botão). Miniaturas, forma de onda e duração são lidas no navegador, e os arquivos ficam guardados no IndexedDB para o projeto reabrir depois
- **Linha do tempo:** trilhas V1–V3 e A1–A3 (adicione mais), vídeo com áudio vinculado, mover entre trilhas, aparar bordas, aparar com ondulação (Ctrl+arrastar), lâmina, cortar no indicador (Ctrl+K), exclusão com ondulação, fechar espaço, encaixe, seleção por retângulo, marcadores, entrada/saída, zoom e bloqueio/silenciar/solo por trilha
- **Monitor de programa:** código de tempo editável, transporte completo, margens de segurança, tela cheia e exportar quadro
- **Controles de efeito:** posição, escala, rotação e opacidade com keyframes (cronômetro e navegação), modos de mesclagem, velocidade, volume com keyframes e fades
- **Cor:** exposição, contraste, saturação, temperatura, matiz, desfoque, vinheta, P&B, sépia e predefinições
- **Transições:** dissolver, mergulho no preto/branco, cortinas, deslizar, empurrar, zoom e desfoque, com alinhamento no corte
- **Títulos e fundos de cor** com as mais de 370 fontes do Forma, e a biblioteca de imagens e elementos
- **Medidores de áudio** e mixagem pelo WebAudio
- **Exportação** em tempo real (canvas + áudio) para WebM (VP9/Opus) ou MP4 (H.264/AAC, quando o navegador grava MP4)

O modelo de edição (sequência, trilhas, itens com início/duração/entrada na mídia/velocidade, transições com "de"/"para" e alinhamento no corte, parâmetros com keyframes) segue a estrutura do [FilmCraft](https://github.com/storytold/filmcraft) (MIT/Apache-2.0), reescrita em TypeScript para o navegador. O tempo de edição é contado em quadros inteiros.

## Suíte de apps (`#/apps`)

O Forma também abre 13 apps completos dentro dele, com hub, troca rápida entre apps e lançador no editor:

| App no Forma | Projeto original | Parecido com |
|---|---|---|
| Forma Foto | PhotoCraft | Photoshop |
| Forma Vetor | VectorCraft | Illustrator |
| Forma Revela | LightCraft | Lightroom |
| Forma Interface | FigCraft | Figma |
| Forma Filme | FilmCraft | Premiere Pro |
| Forma Motion | EffectCraft | After Effects |
| Forma Som | SoundCraft | Audition / DAW |
| Forma Layout | DesignCraft | InDesign |
| Forma PDF | PdfCraft | Acrobat |
| Forma Texto | WordCraft | Word |
| Forma Planilha | GridCraft | Excel |
| Forma Slides | DeckCraft | PowerPoint |
| Forma CAD | CADCraft | AutoCAD |

Forma Textura (SubCraft) só existe para computador; o hub leva para o download.

**Como funciona:** no fim do `npm run build`, `scripts/fetch-apps.mjs` baixa os pacotes web oficiais (`<app>-web-<versão>.zip`) dos releases de cada projeto e coloca em `dist/apps/<id>/`. Ele procura a versão mais nova pela API do GitHub e, se ela não responder, usa a versão de `src/apps/catalog.json`. Um app que falhar aparece como indisponível, sem quebrar o build. Os apps não ficam no repositório.

- `SKIP_APPS=1 npm run build` pula o download (build rápido)
- `APPS_ONLY=foto,pdf` baixa só alguns
- `GITHUB_TOKEN` (opcional, na Vercel) evita o limite de consultas da API do GitHub

Cada app mantém a própria interface e a própria marca dentro da janela: são as versões oficiais, sem modificação, sob licença MIT ou Apache-2.0. A Forma não é afiliada aos autores.

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
scripts/fetch-apps.mjs     # baixa as versões web dos apps no build
api/                       # funções da Vercel
├── pinterest/             # login, callback, me, logout, boards, pins, pin (link)
├── stock.ts               # banco livre (Openverse)
├── img.ts                 # proxy de imagens (só hosts permitidos) para o canvas e o modo Pro
├── svg.ts                 # entrega elementos (SVG) por URL para o modo Pro, sem scripts
└── _lib/                  # código compartilhado (não vira rota)
src/
├── landing/Landing.tsx    # landing page
├── pro/ProEditor.tsx      # modo Pro (Photopea embutido)
├── apps/                  # suíte de apps: catálogo, hub, janela do app e lançador
├── video/                 # Forma Vídeo: modelo, motor de reprodução, mídia, linha do tempo, painéis
├── editor/
│   ├── engine.ts          # motor sobre o Fabric.js: camadas, ferramentas, histórico, exportação
│   ├── commands.ts        # menus, atalhos e paleta de comandos (uma lista só)
│   ├── lut.ts             # filtros próprios: LUT 3D, vinheta, temperatura
│   ├── Library.tsx        # biblioteca (abas Imagens e Elementos)
│   ├── ImageBank.tsx      # aba Imagens: Pinterest e banco livre
│   ├── ElementsPanel.tsx  # aba Elementos
│   ├── elements.ts        # catálogo de formas, linhas, adesivos, molduras, enfeites, gradientes
│   ├── icons.ts           # ícones Lucide + busca em português (carregado sob demanda)
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
- [FilmCraft](https://github.com/storytold/filmcraft) — referência do modelo de edição do Forma Vídeo (MIT/Apache-2.0)
- [fix-webm-duration](https://github.com/yusitnikov/fix-webm-duration) — duração nos WebM exportados (MIT)
- [Lucide](https://lucide.dev) — ícones do banco de elementos (ISC)
- [Photopea](https://www.photopea.com/api/) — editor do modo Pro, embutido pela API pública
- Apps da suíte: [PhotoCraft, VectorCraft, LightCraft, FigCraft, FilmCraft, EffectCraft, SoundCraft, DesignCraft, PdfCraft, WordCraft, GridCraft, DeckCraft, CADCraft](https://github.com/storytold) (MIT/Apache-2.0), versões web oficiais sem modificação; [SubCraft](https://github.com/Aalzard/subcraft) (MIT/Apache-2.0)
- [PhotoSplice](https://github.com/eolix/PhotoSplice) / [PhotoCraft](https://github.com/storytold/photocraft) (MIT/Apache-2.0) — de onde vêm:
  - ícones das ferramentas: [Tabler Icons](https://tabler.io/icons), MIT (`src/assets/tools/LICENSE-tabler.txt`)
  - LUTs de cor: [Fresh LUTs](https://freshluts.com), CC0, reamostrados para 17×17×17
  - referência de conjunto de ferramentas, atalhos e organização dos painéis
