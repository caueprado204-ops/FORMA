import { ArrowRight, Brush, Crown, Download, Heart, House, Images, Keyboard, Layers, MousePointer2, Pin, Shapes, ShieldCheck, Sparkles, Star, Type, Wand2, Zap } from 'lucide-react';
import { Logo } from '../Logo';
import { ToolIcon } from '../editor/ui';

const openEditor = () => { location.hash = '#/editor'; };

const LOOK_COLORS = [
  'linear-gradient(160deg,#1d3b4a,#e8a25e)', 'linear-gradient(160deg,#0f2a2e,#59c2b5)', 'linear-gradient(160deg,#3a2a1c,#f0c27b)',
  'linear-gradient(160deg,#20203a,#a78bfa)', 'linear-gradient(160deg,#2b1b1b,#ff8a65)', 'linear-gradient(160deg,#1b2b1e,#c6f36b)',
];

function Art() {
  return (
    <svg viewBox="0 0 400 500" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1b6b" />
          <stop offset=".55" stopColor="#8a4bd8" />
          <stop offset="1" stopColor="#ff9a6b" />
        </linearGradient>
        <radialGradient id="sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset=".6" stopColor="#ffd36b" />
          <stop offset="1" stopColor="#ff9a6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b3df5" />
          <stop offset="1" stopColor="#120b2e" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#sky)" />
      <circle cx="200" cy="250" r="110" fill="url(#sun)" />
      <path d="M0 300 L70 210 L120 260 L190 170 L260 255 L310 215 L400 290 V340 H0Z" fill="#1c1240" />
      <path d="M0 320 L90 260 L150 300 L230 240 L300 300 L360 270 L400 300 V340 H0Z" fill="#2b1a5c" />
      <rect y="338" width="400" height="162" fill="url(#water)" />
      <g opacity=".55" stroke="#ffd36b" strokeWidth="3" strokeLinecap="round">
        <path d="M160 362h80M140 386h120M170 410h60M185 434h30" />
      </g>
      <text x="200" y="96" textAnchor="middle" fill="#d4ff3a" fontFamily="Bebas Neue, Space Grotesk, sans-serif" fontSize="74" letterSpacing="6">GOLDEN</text>
      <text x="200" y="128" textAnchor="middle" fill="#fff" fontFamily="Space Grotesk, sans-serif" fontSize="15" letterSpacing="9" opacity=".85">HOUR · VOL. 02</text>
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <nav className="nav">
        <div className="wrap">
          <Logo size={30} word />
          <div className="nav-links">
            <a href="#recursos">Recursos</a>
            <a href="#atalhos">Atalhos</a>
            <a href="#como">Como funciona</a>
          </div>
          <div className="nav-cta">
            <a className="btn ghost sm" href="#atalhos">Ver atalhos</a>
            <button className="btn lime sm" onClick={openEditor}>Abrir editor <ArrowRight size={14} /></button>
          </div>
        </div>
      </nav>

      <header className="hero wrap">
        <span className="eyebrow"><b>Novo</b> Forma Studio 2.0 · editor completo no navegador</span>
        <h1>O poder de um editor de imagem, <em>sem instalar nada.</em></h1>
        <p className="lead">Camadas, pincéis, máscaras de seleção, ajustes ao vivo e 18 looks de cinema. Abra uma foto, edite com os atalhos que você já conhece e exporte em segundos.</p>
        <div className="hero-ctas">
          <button className="btn lime" onClick={openEditor}>Começar a editar <ArrowRight size={16} /></button>
          <a className="btn ghost" href="#recursos">Conhecer recursos</a>
        </div>
        <div className="hero-note">Grátis · funciona offline depois de aberto · suas imagens não saem do seu computador</div>

        <div className="mock-wrap" onClick={openEditor} role="button" tabIndex={0} aria-label="Abrir o editor">
          <div className="mock-glow" />
          <div className="mock">
            <div className="mock-top">
              <span className="dots"><i /><i /><i /></span>
              <Logo size={18} />
              <span className="m-menu"><span>Arquivo</span><span>Editar</span><span>Imagem</span><span>Camada</span><span>Filtro</span></span>
              <span className="m-export">Exportar</span>
            </div>
            <div className="mock-tools">
              {['move', 'rselect', 'rcrop', 'brush', 'eraser', 'gradient', 'htype', 'rect', 'hand'].map((t, i) => (
                <span key={t} className={i === 3 ? 'on' : ''}><ToolIcon name={t} size={16} /></span>
              ))}
            </div>
            <div className="mock-stage"><div className="mock-art"><Art /></div></div>
            <div className="mock-panels">
              <div className="mock-card">
                <h6>Ajustes</h6>
                <div className="m-slider"><span>Exposição</span><span>+18</span><i style={{ ['--w' as any]: '59%' }} /></div>
                <div className="m-slider"><span>Contraste</span><span>+24</span><i style={{ ['--w' as any]: '66%' }} /></div>
                <div className="m-slider"><span>Temperatura</span><span>+40</span><i style={{ ['--w' as any]: '70%' }} /></div>
              </div>
              <div className="mock-card">
                <h6>Looks</h6>
                <div className="m-looks">{LOOK_COLORS.slice(0, 8).concat(LOOK_COLORS.slice(0, 2)).slice(0, 8).map((c, i) => <b key={i} className={i === 2 ? 'on' : ''} style={{ background: c }} />)}</div>
              </div>
              <div className="mock-card" style={{ flex: 1 }}>
                <h6>Camadas</h6>
                <div className="m-layer"><b style={{ background: '#d4ff3a' }} />GOLDEN</div>
                <div className="m-layer on"><b style={{ background: 'linear-gradient(#ffd36b,#ff9a6b)' }} />Sol · Tela</div>
                <div className="m-layer"><b style={{ background: '#2b1a5c' }} />Montanhas</div>
                <div className="m-layer"><b style={{ background: 'linear-gradient(#2a1b6b,#ff9a6b)' }} />Céu</div>
              </div>
            </div>
          </div>
          <div className="float f1">
            <div className="f-sv" />
            <div className="f-hue" />
          </div>
          <div className="float f2">
            <b style={{ color: 'var(--text)' }}>Gradiente</b>
            <div className="f-grad" />
            <span className="muted">Opacidade 100% · Linear</span>
          </div>
          <div className="float f3"><span className="kbd-big">Ctrl</span>+<span className="kbd-big">J</span><span className="muted" style={{ marginLeft: 6 }}>Camada via cópia</span></div>
        </div>

        <div className="stats">
          <div><b>14</b><span>ferramentas profissionais</span></div>
          <div><b>18</b><span>looks de cinema (LUTs)</span></div>
          <div><b>2.000+</b><span>ícones e elementos</span></div>
          <div><b>60+</b><span>atalhos de teclado</span></div>
        </div>
      </header>

      <section className="section wrap" id="recursos">
        <div className="section-head">
          <span className="kicker">Recursos</span>
          <h2>Tudo o que você usa no dia a dia, num lugar só.</h2>
          <p>O Forma Studio roda no motor Fabric.js com uma interface pensada do zero: rápida, escura, sem distrações — e com os atalhos clássicos de editores profissionais.</p>
        </div>
        <div className="bento">
          <article className="tile t-a">
            <div className="vis">
              <div className="vis-layer"><b style={{ background: '#d4ff3a' }} />Título<small>Normal</small></div>
              <div className="vis-layer on"><b style={{ background: 'linear-gradient(135deg,#7c5cff,#ff5c9a)' }} />Luz<small>Tela</small></div>
              <div className="vis-layer"><b style={{ background: 'linear-gradient(135deg,#2a1b6b,#ff9a6b)' }} />Foto<small>Multiplicar</small></div>
            </div>
            <span className="ico"><Layers size={20} /></span>
            <h3>Camadas de verdade</h3>
            <p>Arraste para reordenar, agrupe, bloqueie, duplique e mescle. Opacidade e 16 modos de mesclagem por camada, com miniaturas ao vivo.</p>
          </article>
          <article className="tile t-b">
            <div className="lut-strip">{LOOK_COLORS.map((c, i) => <b key={i} style={{ background: c }} />)}</div>
            <h3>Looks de cinema</h3>
            <p>18 LUTs 3D com prévia na sua própria foto e intensidade ajustável.</p>
          </article>
          <article className="tile t-c">
            <svg className="brush-vis" viewBox="0 0 300 110" aria-hidden="true">
              <path d="M10 80 C 60 10, 110 10, 150 55 S 240 100, 290 30" fill="none" stroke="#7c5cff" strokeWidth="14" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 8px #7c5cff)' }} />
              <path d="M20 95 C 80 60, 140 100, 200 70 S 270 60, 290 80" fill="none" stroke="#d4ff3a" strokeWidth="6" strokeLinecap="round" />
            </svg>
            <h3>Pincel e borracha</h3>
            <p>Tamanho, dureza e opacidade, com <kbd>[</kbd> <kbd>]</kbd> para ajustar sem tirar a mão.</p>
          </article>
          <article className="tile t-d">
            <div className="type-vis">Aa<span>Tipografia</span></div>
            <h3>Texto editável</h3>
            <p>Mais de 370 fontes do Google Fonts com busca e prévia, ou envie a sua. Peso, entrelinha, espaçamento e sombra.</p>
          </article>
          <article className="tile t-e">
            <div className="adj-vis">
              <div className="m-slider"><span>Exposição</span><span>+18</span><i style={{ ['--w' as any]: '59%' }} /></div>
              <div className="m-slider"><span>Temperatura</span><span>+32</span><i style={{ ['--w' as any]: '66%' }} /></div>
              <div className="m-slider"><span>Vinheta</span><span>45</span><i style={{ ['--w' as any]: '45%' }} /></div>
            </div>
            <h3><Wand2 size={18} style={{ verticalAlign: -2, color: 'var(--lime)', marginRight: 8 }} />Ajustes ao vivo</h3>
            <p>Exposição, contraste, temperatura, vibração, nitidez, granulado e vinheta — sempre reversíveis.</p>
          </article>
          <article className="tile t-f">
            <div className="export-vis"><span className="on">PNG</span><span>JPG</span><span>WEBP</span><span>0.5x</span><span className="on">2x</span><span>3x</span></div>
            <span className="ico" style={{ position: 'absolute', right: 26, top: 26 }}><Download size={20} /></span>
            <h3>Exporte do jeito certo</h3>
            <p>PNG com transparência, JPG e WEBP com controle de qualidade, até 3x de escala. Salve o projeto em .forma para continuar depois.</p>
          </article>
          <article className="tile t-g">
            <div className="priv-vis"><span className="pulse" />Salvo automaticamente neste navegador</div>
            <span className="ico" style={{ position: 'absolute', right: 26, top: 26 }}><ShieldCheck size={20} /></span>
            <h3>Privado por padrão</h3>
            <p>Suas fotos nunca são enviadas para servidor: tudo é processado no seu dispositivo, e o trabalho fica salvo localmente mesmo se a aba fechar.</p>
          </article>
          <article className="tile t-h">
            <div className="bank-vis" aria-hidden="true">
              {['#7c5cff,#ff5c9a', '#1d3b4a,#e8a25e', '#d4ff3a,#3ddc97', '#2a1b6b,#ff9a6b', '#0f2a2e,#59c2b5', '#ff9f43,#ffd84d', '#3b5bff,#a259ff', '#2b1b1b,#ff8a65'].map((g, i) => (
                <b key={i} style={{ background: `linear-gradient(160deg,${g.split(',')[0]},${g.split(',')[1]})`, height: [120, 80, 150, 96, 136, 88, 110, 140][i] }} />
              ))}
            </div>
            <div className="bank-copy">
              <span className="ico"><Pin size={20} /></span>
              <h3>Banco de imagens ligado ao Pinterest</h3>
              <p>Conecte sua conta e navegue pelas suas pastas sem sair do editor. Cole o link de qualquer pin, ou busque fotos livres para uso comercial. Clique ou arraste para a tela e a imagem vira camada.</p>
              <span className="bank-tags"><span><Pin size={12} />Suas pastas</span><span><Images size={12} />Fotos livres CC</span></span>
            </div>
          </article>
          <article className="tile t-f">
            <div className="el-vis" aria-hidden="true">
              <span style={{ background: '#7c5cff' }} /><span className="r" style={{ background: '#d4ff3a' }} /><span className="t" />
              <i><Star size={22} /></i><i><Heart size={22} /></i><i><House size={22} /></i>
              <b>NOVO</b>
            </div>
            <span className="ico" style={{ position: 'absolute', right: 26, top: 26 }}><Shapes size={20} /></span>
            <h3>Banco de elementos</h3>
            <p>Formas, linhas e setas, mais de 2.000 ícones, adesivos, molduras, enfeites e gradientes. Escolha a cor antes ou depois de colocar.</p>
          </article>
          <article className="tile t-g pro-tile">
            <span className="ico" style={{ position: 'absolute', right: 26, top: 26 }}><Crown size={20} /></span>
            <span className="pro-pill">Modo Pro</span>
            <h3>Precisa de mais? Abra no Photopea</h3>
            <p>Com um clique, a arte vai para o Photopea embutido, com PSD, máscaras e filtros avançados. A biblioteca do Forma continua do lado, e depois você traz o resultado de volta.</p>
            <a className="btn ghost sm" href="#/pro" style={{ alignSelf: 'flex-start', marginTop: 14 }}><Crown size={14} />Abrir o modo Pro</a>
          </article>
        </div>
      </section>

      <section className="section wrap" id="atalhos">
        <div className="section-head">
          <span className="kicker">Atalhos</span>
          <h2>Seus dedos já sabem usar.</h2>
          <p>Os atalhos seguem o padrão dos editores profissionais. Esqueceu algum? <kbd>Ctrl</kbd> <kbd>K</kbd> abre a paleta de comandos com busca.</p>
        </div>
        <div className="keys">
          <div className="keycard">
            <h4><MousePointer2 size={14} />Ferramentas</h4>
            {[['Mover', 'V'], ['Letreiro', 'M'], ['Cortar', 'C'], ['Pincel', 'B'], ['Borracha', 'E'], ['Texto', 'T'], ['Mão', 'Espaço']].map(([a, b]) => <div className="keyrow" key={a}><span>{a}</span><kbd>{b}</kbd></div>)}
          </div>
          <div className="keycard">
            <h4><Layers size={14} />Camadas</h4>
            {[['Nova camada', 'Ctrl+Shift+N'], ['Duplicar', 'Ctrl+J'], ['Agrupar', 'Ctrl+G'], ['Mesclar abaixo', 'Ctrl+E'], ['Mesclar visíveis', 'Ctrl+Shift+E'], ['Trazer à frente', 'Ctrl+Shift+]'], ['Opacidade', '1 … 0']].map(([a, b]) => <div className="keyrow" key={a}><span>{a}</span><kbd>{b}</kbd></div>)}
          </div>
          <div className="keycard">
            <h4><Zap size={14} />Edição</h4>
            {[['Desfazer', 'Ctrl+Z'], ['Refazer', 'Ctrl+Shift+Z'], ['Transformação livre', 'Ctrl+T'], ['Desmarcar', 'Ctrl+D'], ['Preencher', 'Alt+Backspace'], ['Inverter', 'Ctrl+I'], ['Dessaturar', 'Ctrl+Shift+U']].map(([a, b]) => <div className="keyrow" key={a}><span>{a}</span><kbd>{b}</kbd></div>)}
          </div>
          <div className="keycard">
            <h4><Keyboard size={14} />Visualização</h4>
            {[['Aproximar', 'Ctrl++'], ['Afastar', 'Ctrl+−'], ['Ajustar à tela', 'Ctrl+0'], ['100%', 'Ctrl+1'], ['Painéis', 'Tab'], ['Paleta de comandos', 'Ctrl+K'], ['Todos os atalhos', 'Ctrl+/']].map(([a, b]) => <div className="keyrow" key={a}><span>{a}</span><kbd>{b}</kbd></div>)}
          </div>
        </div>
      </section>

      <section className="section wrap" id="como">
        <div className="section-head">
          <span className="kicker">Como funciona</span>
          <h2>Do arquivo ao resultado em três passos.</h2>
        </div>
        <div className="steps">
          <div className="step"><h3>Abra ou crie</h3><p>Arraste uma foto para a tela, cole com <kbd>Ctrl</kbd> <kbd>V</kbd> ou comece de um modelo: post, story, thumbnail, A4.</p></div>
          <div className="step"><h3>Edite em camadas</h3><p>Combine imagens, textos, formas e pinceladas. Aplique looks e ajustes sem perder o original.</p></div>
          <div className="step"><h3>Exporte</h3><p>Baixe em PNG, JPG ou WEBP na escala que precisar, ou salve o projeto para continuar depois.</p></div>
        </div>

        <div className="cta">
          <h2>Sua próxima arte começa agora.</h2>
          <p>Sem cadastro, sem instalação. Abra o editor e solte uma imagem.</p>
          <button className="btn lime" onClick={openEditor}><Sparkles size={16} />Abrir o Forma Studio</button>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div>
            <Logo size={26} word />
            <p>Editor de imagens no navegador. Feito no Brasil com <Brush size={12} style={{ verticalAlign: -1 }} /> e <Type size={12} style={{ verticalAlign: -1 }} />.</p>
          </div>
          <div className="footer-credits">
            Motor de canvas: <a href="https://fabricjs.com" target="_blank" rel="noreferrer">Fabric.js</a> (MIT)<br />
            Ícones de ferramentas e LUTs: <a href="https://github.com/eolix/PhotoSplice" target="_blank" rel="noreferrer">PhotoSplice</a> / PhotoCraft (MIT · Tabler · CC0)<br />
            Ícones dos elementos: <a href="https://lucide.dev" target="_blank" rel="noreferrer">Lucide</a> (ISC) · Modo Pro: <a href="https://www.photopea.com" target="_blank" rel="noreferrer">Photopea</a><br />
            <a href="/privacidade.html">Política de Privacidade</a> · © {new Date().getFullYear()} Forma
          </div>
        </div>
      </footer>
    </div>
  );
}
