"use client";
import { useState, useRef, useEffect } from "react";
import {
  ArrowRight, ArrowUpRight, ArrowLeft, MessageCircle, Upload, CheckCircle2, Clock,
  Layers, Palette, Video, Presentation, Globe, Image as ImageIcon, FileText,
  Send, X, Menu, LayoutGrid, Sparkles, Paperclip, Check, Printer, Megaphone,
  Film, MonitorSmartphone, Wallet, Star, Trophy, Bell, Download, CreditCard,
  Wand2, Type, Loader2, User, Building2, HeartPulse, Landmark, Briefcase,
  ShieldCheck, Lock, Smartphone, History, ThumbsUp, ThumbsDown, Gauge, Users,
} from "lucide-react";

/* ---------------------------------------------------------------
   FORMA — token system (ver documentos anteriores)
----------------------------------------------------------------*/

const SERVICES = [
  { icon: Palette, name: "Branding & identidade" }, { icon: LayoutGrid, name: "Social media" },
  { icon: Layers, name: "UX/UI design" }, { icon: Globe, name: "Sites & landing pages" },
  { icon: Presentation, name: "Apresentações" }, { icon: Film, name: "Motion design" },
  { icon: Video, name: "Edição de vídeo" }, { icon: Type, name: "Copywriting" },
  { icon: ImageIcon, name: "Ilustração" }, { icon: Printer, name: "Materiais impressos" },
  { icon: Megaphone, name: "Marketing digital" }, { icon: MonitorSmartphone, name: "Desenvolvimento web" },
];

const STEPS = ["Briefing recebido", "Em produção", "Em revisão", "Aprovado"];
const STATUS_STYLE = {
  "Briefing recebido": { bg: "var(--mist-soft)", fg: "#6B6A72", dot: "#9A988F" },
  "Em produção": { bg: "var(--signal-soft)", fg: "var(--signal)", dot: "var(--signal)" },
  "Em revisão": { bg: "var(--amber-soft)", fg: "#93650C", dot: "var(--amber)" },
  "Aprovado": { bg: "var(--mint-soft)", fg: "#0E7D63", dot: "var(--mint)" },
};
const CLIENT_USER = "Ana Bezerra";
const DESIGNER_USER = "Marina Alves";

const INITIAL_PROJECTS = [
  { id: "p1", title: "Identidade visual completa", client: "Padaria Trigo & Arte", clientContact: CLIENT_USER, designer: DESIGNER_USER, service: "Branding & identidade", priority: "Alta", status: "Em produção",
    briefing: { objetivo: "Reposicionar a marca com visual mais artesanal e caloroso.", publico: "Moradores do bairro, 25–55 anos.", referencias: "Tons terrosos, serifa suave, texturas de papel kraft.", entregaveis: "Logotipo, paleta, tipografia, aplicações.", prazo: "12 dias úteis" },
    files: [{ name: "referencias-padaria.pdf", kind: "referência", by: CLIENT_USER }],
    messages: [{ from: "designer", author: DESIGNER_USER, text: "Oi, Ana! Já comecei a explorar direções de marca.", time: "09:12" }, { from: "client", author: CLIENT_USER, text: "Perfeito, fico no aguardo!", time: "09:20" }] },
  { id: "p2", title: "Carrossel semanal — Julho", client: "Clínica Vitalis", clientContact: "Dr. Rafael Nunes", designer: DESIGNER_USER, service: "Social media", priority: "Média", status: "Em revisão",
    briefing: { objetivo: "Educar pacientes sobre saúde preventiva.", publico: "Pacientes, 30–60 anos.", referencias: "Paleta clínica, ícones minimalistas.", entregaveis: "5 lâminas + Stories.", prazo: "4 dias úteis" },
    files: [{ name: "carrossel-v1.fig", kind: "entrega", by: DESIGNER_USER }],
    messages: [{ from: "designer", author: DESIGNER_USER, text: "Enviei a primeira versão, aguardo feedback.", time: "14:02" }, { from: "client", author: "Dr. Rafael Nunes", text: "Ficou ótimo! Só aumentar a fonte da lâmina 3.", time: "15:47" }] },
  { id: "p3", title: "Landing page de doações", client: "Igreja Nova Aliança", clientContact: "Pr. Eduardo Lima", designer: DESIGNER_USER, service: "Sites & landing pages", priority: "Média", status: "Briefing recebido",
    briefing: { objetivo: "Página para arrecadar doações para reforma do templo.", publico: "Membros da igreja e comunidade.", referencias: "Visual acolhedor, dourado suave.", entregaveis: "Landing responsiva.", prazo: "8 dias úteis" },
    files: [{ name: "textos-pagina.pdf", kind: "referência", by: "Pr. Eduardo Lima" }],
    messages: [{ from: "client", author: "Pr. Eduardo Lima", text: "Bom dia! Enviei o briefing e os textos.", time: "08:03" }] },
  { id: "p4", title: "Vinheta de abertura", client: "Studio Fit", clientContact: "Carla Menezes", designer: DESIGNER_USER, service: "Motion design", priority: "Baixa", status: "Aprovado",
    briefing: { objetivo: "Vinheta curta para abrir vídeos de treino.", publico: "Alunos do canal.", referencias: "Energia, tipografia bold.", entregaveis: "Vinheta 3s + versão quadrada.", prazo: "5 dias úteis" },
    files: [{ name: "vinheta-final.mp4", kind: "entrega", by: DESIGNER_USER }],
    messages: [{ from: "client", author: "Carla Menezes", text: "Amei! Pode considerar aprovado.", time: "11:30" }] },
  { id: "p5", title: "Cardápio impresso", client: "Padaria Trigo & Arte", clientContact: CLIENT_USER, designer: DESIGNER_USER, service: "Materiais impressos", priority: "Baixa", status: "Aprovado",
    briefing: { objetivo: "Cardápio impresso alinhado à nova identidade.", publico: "Clientes no salão.", referencias: "Usar a Biblioteca da Marca aprovada.", entregaveis: "Cardápio A5 pronto para gráfica.", prazo: "3 dias úteis" },
    files: [{ name: "cardapio-final.pdf", kind: "entrega", by: DESIGNER_USER }],
    messages: [{ from: "client", author: CLIENT_USER, text: "Ficou lindo, aprovado!", time: "10:15" }] },
];

const BRAND_LIBRARY = {
  colors: [{ hex: "#4B3DF2", name: "Índigo assinatura" }, { hex: "#F5A524", name: "Trigo dourado" }, { hex: "#12121A", name: "Ink" }, { hex: "#F5F4F0", name: "Papel kraft" }],
  fonts: ["Fraunces — títulos", "Inter — corpo de texto"],
  files: [{ name: "manual-marca-padaria.pdf", kind: "Manual de identidade" }, { name: "logo-principal.svg", kind: "Logotipo" }, { name: "logo-monograma.svg", kind: "Ícone / monograma" }, { name: "template-post-instagram.fig", kind: "Template" }, { name: "cardapio-final.pdf", kind: "Arte anterior" }],
};

const ACCOUNT_TYPES = [
  { id: "pf", label: "Pessoa física", group: "client", icon: User },
  { id: "empresa", label: "Empresa", group: "client", icon: Building2 },
  { id: "clinica", label: "Clínica / hospital", group: "client", icon: HeartPulse },
  { id: "igreja", label: "Igreja / instituição", group: "client", icon: Landmark },
  { id: "agencia", label: "Agência", group: "client", icon: Briefcase },
  { id: "designer", label: "Designer freelancer", group: "designer", icon: Palette },
  { id: "estudio", label: "Estúdio de design", group: "designer", icon: Palette },
];

function ShapeMark({ size = 28 }) {
  return <span className="shape-mark" style={{ width: size, height: size }} aria-hidden="true" />;
}

/* =================================================================
   LANDING
==================================================================*/
function Landing({ onEnterApp, onSignup }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="bg-paper text-ink" style={{ minHeight: "100vh" }}>
      <header className="nav-wrap">
        <div className="nav-inner">
          <div className="flex items-center gap-2"><ShapeMark size={22} /><span className="font-display" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" }}>FORMA</span></div>
          <nav className="nav-links hidden md:flex"><a href="#servicos">Serviços</a><a href="#ia">Inteligência artificial</a><a href="#planos">Planos</a></nav>
          <div className="hidden md:flex items-center gap-3">
            <button className="btn-ghost" onClick={onEnterApp}>Ver demo</button>
            <button className="btn-primary" onClick={onSignup}>Criar conta <ArrowRight size={15} /></button>
          </div>
          <button className="md:hidden" onClick={() => setNavOpen(!navOpen)} aria-label="Menu">{navOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {navOpen && (
          <div className="nav-mobile md:hidden">
            <a href="#servicos" onClick={() => setNavOpen(false)}>Serviços</a>
            <a href="#ia" onClick={() => setNavOpen(false)}>Inteligência artificial</a>
            <a href="#planos" onClick={() => setNavOpen(false)}>Planos</a>
            <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={onSignup}>Criar conta</button>
          </div>
        )}
      </header>

      <section className="hero-wrap">
        <div className="hero-grid">
          <div className="fade-up">
            <span className="eyebrow">OPERAÇÕES CRIATIVAS, EM UM SÓ LUGAR</span>
            <h1 className="font-display hero-title">Toda ideia<br />começa sem forma.</h1>
            <p className="hero-sub">A FORMA conecta clientes, designers e empresas em um único ambiente, com IA integrada do briefing à entrega. Sem reunião. Sem WhatsApp.</p>
            <div className="flex flex-wrap gap-3" style={{ marginTop: 28 }}>
              <button className="btn-primary" onClick={onSignup}>Criar conta <ArrowRight size={16} /></button>
              <button className="btn-ghost" onClick={onEnterApp}>Ver demo da plataforma</button>
            </div>
            <div className="hero-audience">{["PMEs", "Startups", "Clínicas", "Igrejas", "Agências parceiras", "Designers freelancers"].map((a) => <span key={a} className="chip-mono">{a}</span>)}</div>
          </div>
          <div className="hero-visual fade-up" style={{ animationDelay: "0.1s" }}>
            <div className="blob" />
            <div className="hero-card">
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}><span className="font-mono" style={{ fontSize: 12, color: "#8B8A82" }}>ASSISTENTE FORMA</span><Wand2 size={14} color="var(--signal)" /></div>
              <p style={{ fontSize: 13.5, color: "#6B6A72", lineHeight: 1.5, marginBottom: 14 }}>"Preciso de um carrossel para o novo horário de atendimento."</p>
              <div className="ai-preview-field"><span className="font-mono" style={{ fontSize: 10, color: "#A6A49B" }}>BRIEFING GERADO</span><p style={{ fontSize: 12.5, marginTop: 4 }}>Objetivo, público, referências e prazo, estruturados automaticamente.</p></div>
              <div className="mini-steps" style={{ marginTop: 16 }}>{STEPS.map((s, i) => <div key={s} className={`mini-step ${i <= 0 ? "done" : ""}`} />)}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="ia" className="section section-tint">
        <span className="eyebrow">INTELIGÊNCIA ARTIFICIAL</span>
        <h2 className="font-display section-title">A IA participa do processo, do início ao fim.</h2>
        <div className="ia-grid">
          {[{ t: "Briefing por conversa", d: "Descreva o que precisa em texto livre — a IA estrutura em um briefing completo." }, { t: "Distribuição inteligente", d: "Especialidade, disponibilidade, prazo e avaliações definem o melhor designer para cada projeto." }, { t: "Priorização automática", d: "Prazos e complexidade organizam a fila, sem gestão manual." }, { t: "Resumo de conversas", d: "Threads longas viram um resumo objetivo no painel do designer." }].map((f) => (
            <div className="ia-card" key={f.t}><Wand2 size={18} color="var(--signal)" /><p className="font-display" style={{ fontSize: 16, fontWeight: 600, margin: "12px 0 6px" }}>{f.t}</p><p style={{ fontSize: 13.5, color: "#6B6A72", lineHeight: 1.55 }}>{f.d}</p></div>
          ))}
        </div>
      </section>

      <section id="servicos" className="section">
        <span className="eyebrow">SERVIÇOS</span>
        <h2 className="font-display section-title">Qualquer operação criativa, sob um único fluxo.</h2>
        <div className="services-grid">{SERVICES.map(({ icon: Icon, name }) => <div className="service-chip" key={name}><Icon size={17} strokeWidth={1.75} /><span>{name}</span></div>)}</div>
      </section>

      <section id="planos" className="section section-tint">
        <span className="eyebrow">PLANOS</span>
        <h2 className="font-display section-title">Assinatura para fluxo contínuo. Avulso para o que for pontual.</h2>
        <div className="plans-grid">
          <div className="plan-card"><p className="font-display plan-name">Avulso</p><p className="plan-desc">Pague por projeto, sem compromisso mensal.</p><p className="plan-price">Sob orçamento</p><ul className="plan-list"><li><Check size={14} /> Um serviço por vez</li><li><Check size={14} /> Até 2 rodadas de revisão</li></ul><button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onSignup}>Criar conta</button></div>
          <div className="plan-card plan-featured"><span className="plan-badge">MAIS ESCOLHIDO</span><p className="font-display plan-name">Studio</p><p className="plan-desc">Design contínuo com IA e designer dedicado.</p><p className="plan-price">R$ 1.490<span>/mês</span></p><ul className="plan-list"><li><Check size={14} /> Solicitações ilimitadas</li><li><Check size={14} /> Assistente de briefing com IA</li><li><Check size={14} /> Biblioteca da marca inclusa</li></ul><button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={onSignup}>Assinar Studio</button></div>
          <div className="plan-card"><p className="font-display plan-name">Scale</p><p className="plan-desc">Para agências e times que precisam de volume.</p><p className="plan-price">Sob consulta</p><ul className="plan-list"><li><Check size={14} /> Múltiplas entregas simultâneas</li><li><Check size={14} /> Gestor de conta dedicado</li></ul><button className="btn-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onSignup}>Falar com vendas</button></div>
        </div>
      </section>

      <section className="section cta-final"><ShapeMark size={34} /><h2 className="font-display cta-title">Dê forma ao que você imagina.</h2><button className="btn-primary" onClick={onSignup}>Criar conta <ArrowRight size={16} /></button></section>
      <footer className="footer"><div className="flex items-center gap-2"><ShapeMark size={16} /><span className="font-mono" style={{ fontSize: 12.5 }}>FORMA © 2026</span></div><span className="font-mono" style={{ fontSize: 12.5, color: "#8B8A82" }}>Operações criativas como plataforma</span></footer>
      <StyleSheet />
    </div>
  );
}

/* =================================================================
   SIGNUP FLOW — escolha de tipo de conta + formulário
==================================================================*/
function SignupFlow({ onBack, onDone }) {
  const [step, setStep] = useState("type");
  const [type, setType] = useState(null);
  const [form, setForm] = useState({ nome: "", doc: "", email: "", telefone: "", cidade: "", estado: "", senha: "", aceite: false });

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  const canSubmit = form.nome && form.email && form.senha && form.aceite;

  return (
    <div className="flow-shell">
      <div className="flow-topbar">
        <button className="app-back" onClick={onBack}><ArrowLeft size={16} /> <ShapeMark size={18} /> <span className="font-display" style={{ fontWeight: 600 }}>FORMA</span></button>
      </div>
      <div className="flow-body">
        {step === "type" && (
          <div className="fade-up flow-card">
            <span className="eyebrow">CRIAR CONTA</span>
            <h2 className="font-display flow-title">Qual tipo de conta combina com você?</h2>
            <div className="type-grid">
              {ACCOUNT_TYPES.map((t) => (
                <button key={t.id} className={`type-card ${type?.id === t.id ? "selected" : ""}`} onClick={() => setType(t)}>
                  <t.icon size={20} /><span>{t.label}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" style={{ marginTop: 22 }} disabled={!type} onClick={() => setStep("form")}>Continuar <ArrowRight size={16} /></button>
          </div>
        )}

        {step === "form" && (
          <div className="fade-up flow-card">
            <span className="eyebrow">{type.label.toUpperCase()}</span>
            <h2 className="font-display flow-title">Seus dados de cadastro</h2>
            <div className="form-grid">
              <label className="field"><span>{type.group === "client" ? "Nome completo ou razão social" : "Nome completo"}</span><input value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Ex: Ana Bezerra" /></label>
              <label className="field"><span>{type.group === "client" ? "CPF ou CNPJ" : "CPF"}</span><input value={form.doc} onChange={(e) => update("doc", e.target.value)} placeholder="000.000.000-00" /></label>
              <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="voce@empresa.com" /></label>
              <label className="field"><span>Telefone</span><input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} placeholder="(00) 00000-0000" /></label>
              <label className="field"><span>Cidade</span><input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} placeholder="São Paulo" /></label>
              <label className="field"><span>Estado</span><input value={form.estado} onChange={(e) => update("estado", e.target.value)} placeholder="SP" /></label>
              <label className="field" style={{ gridColumn: "1 / -1" }}><span>Senha</span><input type="password" value={form.senha} onChange={(e) => update("senha", e.target.value)} placeholder="Crie uma senha" /></label>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.aceite} onChange={(e) => update("aceite", e.target.checked)} />
              <span>Li e aceito os termos de uso e a política de privacidade.</span>
            </label>
            <div className="flex gap-2" style={{ marginTop: 18 }}>
              <button className="btn-ghost" onClick={() => setStep("type")}>Voltar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!canSubmit} onClick={() => onDone(type.group)}>
                Criar conta <ArrowRight size={16} />
              </button>
            </div>
            <p style={{ fontSize: 11.5, color: "#A6A49B", marginTop: 14 }}>Enviaremos um código de verificação por e-mail (e por SMS, se preferir) antes de liberar o acesso.</p>
          </div>
        )}
      </div>
      <StyleSheet />
    </div>
  );
}

/* =================================================================
   ONBOARDING DO CLIENTE
==================================================================*/
const ONBOARD_STEPS = ["segmento", "servicos", "identidade", "publico"];
function OnboardingWizard({ onComplete }) {
  const [i, setI] = useState(0);
  const [data, setData] = useState({ segmento: "", servicos: [], temIdentidade: null, cores: [], publico: "", objetivos: "" });
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  function toggleServico(name) {
    setData((d) => ({ ...d, servicos: d.servicos.includes(name) ? d.servicos.filter((s) => s !== name) : [...d.servicos, name] }));
  }
  function toggleCor(hex) {
    setData((d) => ({ ...d, cores: d.cores.includes(hex) ? d.cores.filter((c) => c !== hex) : [...d.cores, hex] }));
  }
  function next() {
    if (i < ONBOARD_STEPS.length - 1) return setI(i + 1);
    setCreating(true);
    setTimeout(() => { setCreating(false); setDone(true); }, 1200);
  }

  const swatches = ["#4B3DF2", "#17C3A2", "#F5A524", "#E14A3D", "#12121A", "#8B7CFF"];

  if (done) {
    return (
      <div className="flow-shell">
        <div className="flow-body">
          <div className="fade-up flow-card" style={{ textAlign: "center" }}>
            <ShapeMark size={40} />
            <h2 className="font-display flow-title" style={{ marginTop: 16 }}>Sua Biblioteca da Marca foi criada.</h2>
            <p style={{ fontSize: 14, color: "#6B6A72", marginTop: 8 }}>Já organizamos um espaço com suas cores, referências e objetivos — pronto para o primeiro designer que assumir um projeto seu.</p>
            <button className="btn-primary" style={{ marginTop: 22 }} onClick={onComplete}>Ir para o meu painel <ArrowRight size={16} /></button>
          </div>
        </div>
        <StyleSheet />
      </div>
    );
  }

  return (
    <div className="flow-shell">
      <div className="flow-body">
        <div className="fade-up flow-card">
          <span className="eyebrow">CONFIGURAÇÃO INICIAL</span>
          <div className="wizard-progress">{ONBOARD_STEPS.map((s, idx) => <div key={s} className={`mini-step ${idx <= i ? "done" : ""}`} />)}</div>

          {creating ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <Loader2 size={26} className="spin" color="var(--signal)" />
              <p style={{ marginTop: 14, fontSize: 14 }}>Criando sua Biblioteca da Marca…</p>
            </div>
          ) : (
            <>
              {i === 0 && (
                <>
                  <h2 className="font-display flow-title">Qual o segmento da sua empresa?</h2>
                  <div className="type-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {["Alimentação", "Saúde", "Varejo", "Serviços", "Educação", "Comunidade / ONG"].map((s) => (
                      <button key={s} className={`type-card ${data.segmento === s ? "selected" : ""}`} onClick={() => setData((d) => ({ ...d, segmento: s }))}><span>{s}</span></button>
                    ))}
                  </div>
                </>
              )}
              {i === 1 && (
                <>
                  <h2 className="font-display flow-title">Quais serviços você deseja contratar?</h2>
                  <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
                    {SERVICES.map((s) => (
                      <button key={s.name} className={`chip-btn ${data.servicos.includes(s.name) ? "chip-btn-active" : ""}`} onClick={() => toggleServico(s.name)}>{s.name}</button>
                    ))}
                  </div>
                </>
              )}
              {i === 2 && (
                <>
                  <h2 className="font-display flow-title">Você já possui identidade visual?</h2>
                  <div className="flex gap-2" style={{ marginTop: 16 }}>
                    <button className={`chip-btn ${data.temIdentidade === true ? "chip-btn-active" : ""}`} onClick={() => setData((d) => ({ ...d, temIdentidade: true }))}>Sim, já tenho logotipo</button>
                    <button className={`chip-btn ${data.temIdentidade === false ? "chip-btn-active" : ""}`} onClick={() => setData((d) => ({ ...d, temIdentidade: false }))}>Ainda não</button>
                  </div>
                  <p className="font-mono overview-label" style={{ marginTop: 22 }}>CORES QUE REPRESENTAM SUA MARCA</p>
                  <div className="swatch-row" style={{ marginTop: 8 }}>
                    {swatches.map((hex) => (
                      <button key={hex} className="swatch-pick" onClick={() => toggleCor(hex)} style={{ background: hex, outline: data.cores.includes(hex) ? "3px solid var(--ink)" : "1px solid var(--mist)" }} />
                    ))}
                  </div>
                </>
              )}
              {i === 3 && (
                <>
                  <h2 className="font-display flow-title">Pra fechar: público e objetivos</h2>
                  <label className="field" style={{ marginTop: 14 }}><span>Público-alvo</span><textarea rows={2} value={data.publico} onChange={(e) => setData((d) => ({ ...d, publico: e.target.value }))} placeholder="Quem são seus clientes?" /></label>
                  <label className="field" style={{ marginTop: 12 }}><span>Objetivos da empresa</span><textarea rows={2} value={data.objetivos} onChange={(e) => setData((d) => ({ ...d, objetivos: e.target.value }))} placeholder="O que você quer alcançar nos próximos meses?" /></label>
                </>
              )}
              <div className="flex gap-2" style={{ marginTop: 22 }}>
                {i > 0 && <button className="btn-ghost" onClick={() => setI(i - 1)}>Voltar</button>}
                <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={next}>{i === ONBOARD_STEPS.length - 1 ? "Concluir" : "Continuar"} <ArrowRight size={16} /></button>
              </div>
            </>
          )}
        </div>
      </div>
      <StyleSheet />
    </div>
  );
}

/* =================================================================
   CADASTRO E STATUS DE APROVAÇÃO DO DESIGNER
==================================================================*/
function DesignerApplyForm({ onSubmit }) {
  const [data, setData] = useState({ nome: "", email: "", especialidades: [], portfolio: "", behance: "", disponibilidade: "20h/semana" });
  function toggleEsp(name) { setData((d) => ({ ...d, especialidades: d.especialidades.includes(name) ? d.especialidades.filter((s) => s !== name) : [...d.especialidades, name] })); }
  const canSubmit = data.nome && data.email && data.especialidades.length > 0 && data.portfolio;
  return (
    <div className="flow-shell">
      <div className="flow-body">
        <div className="fade-up flow-card">
          <span className="eyebrow">CADASTRO DE DESIGNER</span>
          <h2 className="font-display flow-title">Vamos conhecer seu trabalho.</h2>
          <div className="form-grid">
            <label className="field"><span>Nome completo</span><input value={data.nome} onChange={(e) => setData((d) => ({ ...d, nome: e.target.value }))} placeholder="Seu nome" /></label>
            <label className="field"><span>E-mail</span><input value={data.email} onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))} placeholder="voce@email.com" /></label>
            <label className="field"><span>Portfólio (link)</span><input value={data.portfolio} onChange={(e) => setData((d) => ({ ...d, portfolio: e.target.value }))} placeholder="behance.net/voce" /></label>
            <label className="field"><span>Behance / Dribbble</span><input value={data.behance} onChange={(e) => setData((d) => ({ ...d, behance: e.target.value }))} placeholder="opcional" /></label>
            <label className="field"><span>Disponibilidade semanal</span>
              <select value={data.disponibilidade} onChange={(e) => setData((d) => ({ ...d, disponibilidade: e.target.value }))}>
                <option>10h/semana</option><option>20h/semana</option><option>30h/semana</option><option>40h/semana</option>
              </select>
            </label>
          </div>
          <p className="font-mono overview-label" style={{ marginTop: 18 }}>ÁREAS DE ESPECIALIZAÇÃO</p>
          <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
            {SERVICES.map((s) => <button key={s.name} className={`chip-btn ${data.especialidades.includes(s.name) ? "chip-btn-active" : ""}`} onClick={() => toggleEsp(s.name)}>{s.name}</button>)}
          </div>
          <button className="btn-primary" style={{ marginTop: 22, width: "100%", justifyContent: "center" }} disabled={!canSubmit} onClick={onSubmit}>Enviar cadastro <ArrowRight size={16} /></button>
        </div>
      </div>
      <StyleSheet />
    </div>
  );
}

function DesignerStatusScreen({ onEnter }) {
  const [approved, setApproved] = useState(false);
  const pipeline = ["Documentação enviada", "Validação automática", "Teste técnico", "Avaliação da equipe", "Aprovação"];
  const currentIndex = approved ? pipeline.length : 2;
  return (
    <div className="flow-shell">
      <div className="flow-body">
        <div className="fade-up flow-card">
          <span className="eyebrow">STATUS DA APLICAÇÃO</span>
          <h2 className="font-display flow-title">{approved ? "Você foi aprovado!" : "Seu cadastro está em análise."}</h2>
          <div className="approval-pipeline">
            {pipeline.map((s, i) => (
              <div className="approval-step" key={s}>
                <div className={`pipeline-dot ${i < currentIndex ? "done" : ""} ${i === currentIndex ? "current" : ""}`}>{i < currentIndex ? <Check size={12} /> : null}</div>
                <span className={i < currentIndex ? "pipeline-label done" : "pipeline-label"}>{s}</span>
              </div>
            ))}
          </div>
          {!approved ? (
            <>
              <p style={{ fontSize: 13.5, color: "#6B6A72", marginTop: 18 }}>Normalmente levamos até 3 dias úteis para concluir a avaliação. Você recebe uma notificação a cada etapa.</p>
              <button className="btn-ghost" style={{ marginTop: 18 }} onClick={() => setApproved(true)}>Simular aprovação (demo)</button>
            </>
          ) : (
            <button className="btn-primary" style={{ marginTop: 18 }} onClick={onEnter}><CheckCircle2 size={16} /> Entrar na plataforma como designer</button>
          )}
        </div>
      </div>
      <StyleSheet />
    </div>
  );
}

/* =================================================================
   ASSISTENTE DE BRIEFING (IA real)
==================================================================*/
function AIAssistantModal({ onClose, onCreateProject }) {
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); const [result, setResult] = useState(null);
  async function generate() {
    if (!input.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: input.trim() }),
      });
      if (!res.ok) throw new Error("request failed");
      const parsed = await res.json();
      setResult(parsed);
    } catch (e) { setError("Não consegui gerar o briefing agora. Tente novamente."); }
    finally { setLoading(false); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <div className="flex items-center gap-2"><Wand2 size={17} color="var(--signal)" /><p className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>Assistente de briefing</p></div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 13, color: "#6B6A72", marginBottom: 16 }}>Descreva o que você precisa. A IA estrutura o briefing pra você.</p>
        {!result && (
          <>
            <textarea className="ai-textarea" rows={4} placeholder="Ex: preciso de posts pra Instagram anunciando o novo horário…" value={input} onChange={(e) => setInput(e.target.value)} />
            {error && <p style={{ fontSize: 12.5, color: "#C0392B", marginTop: 8 }}>{error}</p>}
            <button className="btn-primary" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={generate} disabled={loading}>{loading ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}{loading ? "Gerando briefing…" : "Gerar briefing com IA"}</button>
          </>
        )}
        {result && (
          <div className="fade-up">
            <div className="ai-result">
              <p className="font-display" style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{result.titulo}</p>
              <span className="chip-mono" style={{ display: "inline-block", marginBottom: 12 }}>{result.servico}</span>
              {[["Objetivo", result.objetivo], ["Público", result.publico], ["Referências", result.referencias], ["Entregáveis", result.entregaveis], ["Prazo", result.prazo]].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}><p className="font-mono overview-label">{k.toUpperCase()}</p><p style={{ fontSize: 13.5 }}>{v}</p></div>
              ))}
            </div>
            <div className="flex gap-2" style={{ marginTop: 14 }}>
              <button className="btn-ghost" onClick={() => setResult(null)}>Refazer</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onCreateProject(result)}><CheckCircle2 size={16} /> Criar projeto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================================================
   PROJECTS SECTION
==================================================================*/
function ProjectsSection({ role, projects, activeId, setActiveId, tab, setTab, sendMessage, draft, setDraft, setStatus, addDeliverable, scrollRef, onOpenAI }) {
  const active = projects.find((p) => p.id === activeId);
  const currentUser = role === "client" ? CLIENT_USER : DESIGNER_USER;
  const priorityOrder = { Alta: 0, Média: 1, Baixa: 2 };
  const ordered = role === "designer" ? [...projects].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]) : projects;
  const stepIndex = active ? STEPS.indexOf(active.status) : 0;
  return (
    <div className="projects-layout">
      <aside className="app-sidebar-inner">
        <p className="font-mono sidebar-label">{role === "designer" ? "ATRIBUÍDOS" : "MEUS PROJETOS"}</p>
        {role === "client" && <button className="ai-cta" onClick={onOpenAI}><Wand2 size={15} /> Criar projeto com IA</button>}
        <div className="project-list">
          {ordered.map((p) => (
            <button key={p.id} className={`project-item ${p.id === activeId ? "active" : ""}`} onClick={() => { setActiveId(p.id); setTab("overview"); }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}><span className="font-mono" style={{ fontSize: 10.5, color: "#8B8A82" }}>{p.service}</span>{role === "designer" && <span className={`priority-dot priority-${p.priority}`} />}</div>
              <p style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{p.title}</p>
              <p style={{ fontSize: 12, color: "#8B8A82", marginBottom: 8 }}>{p.client}</p>
              <span className="status-pill sm" style={{ background: STATUS_STYLE[p.status].bg, color: STATUS_STYLE[p.status].fg }}><span className="dot" style={{ background: STATUS_STYLE[p.status].dot }} />{p.status}</span>
            </button>
          ))}
        </div>
      </aside>
      {active && (
        <div className="app-main-inner">
          <div className="app-main-header">
            <div><p className="font-mono" style={{ fontSize: 11.5, color: "#8B8A82", marginBottom: 4 }}>{active.service.toUpperCase()} · {active.client}</p><h2 className="font-display" style={{ fontSize: 22, fontWeight: 600 }}>{active.title}</h2></div>
            <span className="status-pill" style={{ background: STATUS_STYLE[active.status].bg, color: STATUS_STYLE[active.status].fg }}><span className="dot" style={{ background: STATUS_STYLE[active.status].dot }} />{active.status}</span>
          </div>
          <div className="tabs">{[["overview", "Visão geral"], ["briefing", "Briefing"], ["files", "Arquivos"], ["chat", "Chat"]].map(([key, label]) => (
            <button key={key} className={tab === key ? "tab active" : "tab"} onClick={() => setTab(key)}>{label}{key === "chat" && active.messages.length > 0 && <span className="tab-badge">{active.messages.length}</span>}</button>
          ))}</div>
          <div className="tab-panel">
            {tab === "overview" && (
              <div className="fade-up">
                <div className="pipeline">
                  {STEPS.map((s, i) => (
                    <div key={s} className="pipeline-item">
                      <div className={`pipeline-dot ${i <= stepIndex ? "done" : ""} ${i === stepIndex ? "current" : ""}`}>{i < stepIndex ? <Check size={12} /> : null}</div>
                      <span className={i <= stepIndex ? "pipeline-label done" : "pipeline-label"}>{s}</span>
                      {i < STEPS.length - 1 && <div className={`pipeline-line ${i < stepIndex ? "done" : ""}`} />}
                    </div>
                  ))}
                </div>
                <div className="overview-grid">
                  <div className="overview-card"><p className="font-mono overview-label">RESUMO DO BRIEFING</p><p style={{ fontSize: 14, lineHeight: 1.6, color: "#3C3B42" }}>{active.briefing.objetivo}</p></div>
                  <div className="overview-card"><p className="font-mono overview-label">PRAZO</p><p style={{ fontSize: 14, fontWeight: 600 }}>{active.briefing.prazo}</p><p className="font-mono overview-label" style={{ marginTop: 14 }}>DESIGNER</p><p style={{ fontSize: 14 }}>{active.designer}</p></div>
                </div>
                <div className="actions-row">
                  {role === "designer" && (<><p className="font-mono overview-label" style={{ width: "100%" }}>ALTERAR STATUS</p>{STEPS.map((s) => <button key={s} className={`chip-btn ${active.status === s ? "chip-btn-active" : ""}`} onClick={() => setStatus(active.id, s)}>{s}</button>)}</>)}
                  {role === "client" && (<>
                    {active.status !== "Aprovado" && <button className="btn-primary" onClick={() => setStatus(active.id, "Aprovado")}><CheckCircle2 size={16} /> Aprovar projeto</button>}
                    <button className="btn-ghost" onClick={() => setTab("chat")}><MessageCircle size={16} /> Solicitar revisão</button>
                  </>)}
                </div>
              </div>
            )}
            {tab === "briefing" && (
              <div className="fade-up briefing-view">
                {Object.entries({ Objetivo: active.briefing.objetivo, "Público-alvo": active.briefing.publico, Referências: active.briefing.referencias, Entregáveis: active.briefing.entregaveis, Prazo: active.briefing.prazo }).map(([k, v]) => (
                  <div className="briefing-field" key={k}><p className="font-mono overview-label">{k.toUpperCase()}</p><p style={{ fontSize: 14, lineHeight: 1.6 }}>{v}</p></div>
                ))}
              </div>
            )}
            {tab === "files" && (
              <div className="fade-up">
                <div className="files-list">
                  {active.files.map((f, i) => (
                    <div className="file-row" key={i}><div className="flex items-center gap-3"><div className="file-icon"><FileText size={16} /></div><div><p style={{ fontSize: 13.5, fontWeight: 600 }}>{f.name}</p><p className="font-mono" style={{ fontSize: 11, color: "#8B8A82" }}>{f.kind === "entrega" ? "entrega" : "referência"} · enviado por {f.by}</p></div></div><ArrowUpRight size={15} color="#8B8A82" /></div>
                  ))}
                  {active.files.length === 0 && <p style={{ fontSize: 13, color: "#8B8A82" }}>Nenhum arquivo ainda.</p>}
                </div>
                {role === "designer" && <button className="btn-primary" style={{ marginTop: 18 }} onClick={() => addDeliverable(active.id)}><Upload size={16} /> Enviar entrega</button>}
                {role === "client" && <button className="btn-ghost" style={{ marginTop: 18 }}><Paperclip size={16} /> Adicionar referência</button>}
              </div>
            )}
            {tab === "chat" && (
              <div className="chat-view fade-up">
                <div className="chat-thread" ref={scrollRef}>
                  {active.messages.map((m, i) => (
                    <div key={i} className={`bubble-row ${m.from === role ? "mine" : ""}`}>
                      <div className="avatar sm">{m.author?.[0]}</div>
                      <div className="bubble"><div className="flex items-center gap-2" style={{ marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{m.author}</span><span className="font-mono" style={{ fontSize: 10.5, color: "#A6A49B" }}>{m.time}</span></div><p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{m.text}</p></div>
                    </div>
                  ))}
                </div>
                <div className="chat-input-row">
                  <input className="chat-input" placeholder={`Escrever como ${currentUser}…`} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                  <button className="send-btn" onClick={sendMessage}><Send size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =================================================================
   DASHBOARDS: CLIENTE
==================================================================*/
function ClientOverview({ myProjects, onOpenAI, goTo }) {
  const active = myProjects.filter((p) => p.status !== "Aprovado");
  const done = myProjects.filter((p) => p.status === "Aprovado");
  return (
    <div className="fade-up dash-page">
      <h2 className="font-display dash-title">Olá, {CLIENT_USER.split(" ")[0]}</h2>
      <p className="dash-sub">Padaria Trigo & Arte</p>
      <div className="stat-grid">
        <div className="stat-card"><p className="font-mono overview-label">TEMPO MÉDIO DE ENTREGA</p><p className="stat-value">3,2 dias</p></div>
        <div className="stat-card"><p className="font-mono overview-label">PROJETOS REALIZADOS</p><p className="stat-value">{done.length}</p></div>
        <div className="stat-card"><p className="font-mono overview-label">PROJETOS ATIVOS</p><p className="stat-value">{active.length}</p></div>
        <div className="stat-card"><p className="font-mono overview-label">GASTO ESTE MÊS</p><p className="stat-value">R$ 1.490</p></div>
      </div>
      <button className="ai-banner" onClick={onOpenAI}><div className="flex items-center gap-3"><Wand2 size={20} /><div style={{ textAlign: "left" }}><p style={{ fontWeight: 600, fontSize: 14.5 }}>Criar projeto com o Assistente FORMA</p><p style={{ fontSize: 12.5, opacity: 0.85 }}>Descreva o que precisa e a IA monta o briefing.</p></div></div><ArrowRight size={18} /></button>
      <div className="dash-cols">
        <div><p className="font-mono overview-label" style={{ marginBottom: 10 }}>PROJETOS ATIVOS</p><div className="mini-list">
          {active.map((p) => <button key={p.id} className="mini-row" onClick={() => goTo(p.id)}><span>{p.title}</span><span className="status-pill sm" style={{ background: STATUS_STYLE[p.status].bg, color: STATUS_STYLE[p.status].fg }}><span className="dot" style={{ background: STATUS_STYLE[p.status].dot }} />{p.status}</span></button>)}
          {active.length === 0 && <p style={{ fontSize: 13, color: "#8B8A82" }}>Nenhum projeto ativo agora.</p>}
        </div></div>
        <div><p className="font-mono overview-label" style={{ marginBottom: 10 }}>CONCLUÍDOS</p><div className="mini-list">
          {done.map((p) => <button key={p.id} className="mini-row" onClick={() => goTo(p.id)}><span>{p.title}</span><Check size={14} color="var(--mint)" /></button>)}
        </div></div>
      </div>
    </div>
  );
}

function ClientBrand({ justCreated }) {
  return (
    <div className="fade-up dash-page">
      {justCreated && <div className="success-banner"><CheckCircle2 size={16} /> Biblioteca da marca criada a partir do seu onboarding.</div>}
      <h2 className="font-display dash-title">Biblioteca da marca</h2>
      <p className="dash-sub">Todo material da Padaria Trigo & Arte, sempre à mão de quem assumir um projeto.</p>
      <p className="font-mono overview-label" style={{ marginTop: 24, marginBottom: 10 }}>PALETA</p>
      <div className="swatch-row">{BRAND_LIBRARY.colors.map((c) => <div className="swatch" key={c.hex}><div className="swatch-color" style={{ background: c.hex }} /><span className="font-mono" style={{ fontSize: 11 }}>{c.hex}</span><span style={{ fontSize: 11.5, color: "#6B6A72" }}>{c.name}</span></div>)}</div>
      <p className="font-mono overview-label" style={{ marginTop: 26, marginBottom: 10 }}>TIPOGRAFIA</p>
      <div className="flex gap-2 flex-wrap">{BRAND_LIBRARY.fonts.map((f) => <span className="chip-mono" key={f}>{f}</span>)}</div>
      <p className="font-mono overview-label" style={{ marginTop: 26, marginBottom: 10 }}>ARQUIVOS</p>
      <div className="files-list">{BRAND_LIBRARY.files.map((f, i) => <div className="file-row" key={i}><div className="flex items-center gap-3"><div className="file-icon"><FileText size={16} /></div><div><p style={{ fontSize: 13.5, fontWeight: 600 }}>{f.name}</p><p className="font-mono" style={{ fontSize: 11, color: "#8B8A82" }}>{f.kind}</p></div></div><Download size={15} color="#8B8A82" /></div>)}</div>
    </div>
  );
}

function ClientFinance() {
  const invoices = [{ id: "NF-0032", date: "01 jul 2026", desc: "Assinatura Studio", value: "R$ 1.490,00", status: "Pago" }, { id: "NF-0028", date: "01 jun 2026", desc: "Assinatura Studio", value: "R$ 1.490,00", status: "Pago" }, { id: "NF-0021", date: "14 mai 2026", desc: "Cardápio impresso (avulso)", value: "R$ 380,00", status: "Pago" }];
  return (
    <div className="fade-up dash-page">
      <h2 className="font-display dash-title">Financeiro</h2>
      <div className="dash-cols" style={{ marginTop: 20 }}>
        <div className="overview-card"><p className="font-mono overview-label">PLANO ATUAL</p><p style={{ fontSize: 16, fontWeight: 600 }}>Studio — R$ 1.490/mês</p><p style={{ fontSize: 12.5, color: "#8B8A82", marginTop: 4 }}>Próxima cobrança em 01 ago 2026</p></div>
        <div className="overview-card"><p className="font-mono overview-label">FORMA DE PAGAMENTO</p><div className="flex items-center gap-2" style={{ marginTop: 4 }}><CreditCard size={16} /><p style={{ fontSize: 14 }}>Cartão terminando em 4242</p></div><button className="btn-ghost" style={{ marginTop: 12, fontSize: 12.5, padding: "7px 12px" }}>Trocar forma de pagamento</button></div>
      </div>
      <p className="font-mono overview-label" style={{ marginTop: 26, marginBottom: 10 }}>FATURAS</p>
      <div className="files-list">{invoices.map((inv) => <div className="file-row" key={inv.id}><div><p style={{ fontSize: 13.5, fontWeight: 600 }}>{inv.desc}</p><p className="font-mono" style={{ fontSize: 11, color: "#8B8A82" }}>{inv.id} · {inv.date}</p></div><div className="flex items-center gap-3"><span className="status-pill sm" style={{ background: "var(--mint-soft)", color: "#0E7D63" }}>{inv.status}</span><span style={{ fontSize: 13.5, fontWeight: 600 }}>{inv.value}</span><Download size={15} color="#8B8A82" /></div></div>)}</div>
    </div>
  );
}

/* =================================================================
   DASHBOARDS: DESIGNER
==================================================================*/
function DesignerOverview({ myProjects, goTo }) {
  const priorityOrder = { Alta: 0, Média: 1, Baixa: 2 };
  const byPriority = [...myProjects].filter((p) => p.status !== "Aprovado").sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const week = [{ d: "Seg", h: 6 }, { d: "Ter", h: 7 }, { d: "Qua", h: 5 }, { d: "Qui", h: 8 }, { d: "Sex", h: 4 }];
  const maxH = Math.max(...week.map((w) => w.h));
  return (
    <div className="fade-up dash-page">
      <h2 className="font-display dash-title">Olá, {DESIGNER_USER.split(" ")[0]}</h2>
      <p className="dash-sub">Sua semana de produção</p>
      <div className="dash-cols" style={{ marginTop: 20 }}>
        <div>
          <p className="font-mono overview-label" style={{ marginBottom: 10 }}>AGENDA DE HOJE</p>
          <div className="mini-list">
            <div className="agenda-row"><span className="font-mono" style={{ fontSize: 11.5, color: "#8B8A82" }}>09:00</span><span>Início — Identidade visual, Padaria Trigo & Arte</span></div>
            <div className="agenda-row"><span className="font-mono" style={{ fontSize: 11.5, color: "#8B8A82" }}>14:00</span><span>Entrega — Carrossel, Clínica Vitalis</span></div>
          </div>
          <p className="font-mono overview-label" style={{ marginTop: 22, marginBottom: 10 }}>PROJETOS POR PRIORIDADE</p>
          <div className="mini-list">{byPriority.map((p) => <button key={p.id} className="mini-row" onClick={() => goTo(p.id)}><div className="flex items-center gap-2"><span className={`priority-dot priority-${p.priority}`} /><span>{p.title}</span></div><span style={{ fontSize: 11.5, color: "#8B8A82" }}>{p.client}</span></button>)}</div>
        </div>
        <div>
          <p className="font-mono overview-label" style={{ marginBottom: 10 }}>PRODUTIVIDADE — HORAS/DIA</p>
          <div className="overview-card"><div className="bar-chart">{week.map((w) => <div className="bar-col" key={w.d}><div className="bar" style={{ height: `${(w.h / maxH) * 90}px` }} /><span className="font-mono" style={{ fontSize: 10.5, color: "#8B8A82" }}>{w.d}</span></div>)}</div></div>
          <p className="font-mono overview-label" style={{ marginTop: 18, marginBottom: 10 }}>NOTIFICAÇÕES</p>
          <div className="mini-list"><div className="agenda-row"><Bell size={14} color="var(--signal)" /><span>Novo projeto recebido: Cardápio impresso</span></div></div>
        </div>
      </div>
    </div>
  );
}

function DesignerEarnings() {
  const rows = [{ p: "Identidade visual — Padaria Trigo & Arte", v: "R$ 620,00", s: "Pendente" }, { p: "Carrossel semanal — Clínica Vitalis", v: "R$ 240,00", s: "Pago" }, { p: "Vinheta de abertura — Studio Fit", v: "R$ 310,00", s: "Pago" }];
  return (
    <div className="fade-up dash-page">
      <h2 className="font-display dash-title">Ganhos</h2>
      <div className="stat-grid" style={{ marginTop: 20 }}>
        <div className="stat-card"><p className="font-mono overview-label">RECEBIDO EM JULHO</p><p className="stat-value">R$ 730,00</p></div>
        <div className="stat-card"><p className="font-mono overview-label">A RECEBER</p><p className="stat-value">R$ 620,00</p></div>
        <div className="stat-card"><p className="font-mono overview-label">PRÓXIMO REPASSE</p><p className="stat-value" style={{ fontSize: 16 }}>22 jul</p></div>
      </div>
      <p className="font-mono overview-label" style={{ marginTop: 24, marginBottom: 10 }}>POR PROJETO</p>
      <div className="files-list">{rows.map((r, i) => <div className="file-row" key={i}><p style={{ fontSize: 13.5 }}>{r.p}</p><div className="flex items-center gap-3"><span className="status-pill sm" style={{ background: r.s === "Pago" ? "var(--mint-soft)" : "var(--amber-soft)", color: r.s === "Pago" ? "#0E7D63" : "#93650C" }}>{r.s}</span><span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.v}</span></div></div>)}</div>
    </div>
  );
}

function DesignerRatings() {
  const reviews = [{ c: "Ana Bezerra", t: "Entendeu exatamente o clima que a gente queria pra marca.", r: 5 }, { c: "Dr. Rafael Nunes", t: "Rápida no ajuste e muito atenciosa nos comentários.", r: 5 }];
  return (
    <div className="fade-up dash-page">
      <h2 className="font-display dash-title">Avaliações</h2>
      <div className="dash-cols" style={{ marginTop: 20 }}>
        <div className="overview-card" style={{ textAlign: "center" }}><div className="flex items-center justify-center gap-1" style={{ marginBottom: 6 }}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} fill="var(--amber)" color="var(--amber)" />)}</div><p className="stat-value">4,9</p><p style={{ fontSize: 12.5, color: "#8B8A82" }}>de 38 avaliações</p></div>
        <div className="overview-card"><div className="flex items-center gap-2" style={{ marginBottom: 8 }}><Trophy size={18} color="var(--signal)" /><p style={{ fontWeight: 600 }}>#3 de 42 designers</p></div><p className="font-mono overview-label" style={{ marginTop: 8 }}>META DO MÊS</p><div className="goal-bar"><div className="goal-fill" style={{ width: "80%" }} /></div><p style={{ fontSize: 12.5, color: "#8B8A82", marginTop: 6 }}>8 de 10 projetos concluídos</p></div>
      </div>
      <p className="font-mono overview-label" style={{ marginTop: 24, marginBottom: 10 }}>COMENTÁRIOS RECENTES</p>
      <div className="mini-list">{reviews.map((r, i) => <div className="review-row" key={i}><div className="flex items-center justify-between" style={{ marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 600 }}>{r.c}</span><div className="flex">{Array.from({ length: r.r }).map((_, j) => <Star key={j} size={12} fill="var(--amber)" color="var(--amber)" />)}</div></div><p style={{ fontSize: 13, color: "#4A4940" }}>{r.t}</p></div>)}</div>
    </div>
  );
}

/* =================================================================
   SEGURANÇA (cliente/designer)
==================================================================*/
function SecurityPage() {
  const [twoFA, setTwoFA] = useState(true);
  const acessos = [
    { d: "Chrome · Windows — São Paulo, BR", t: "hoje às 09:12" },
    { d: "App iOS — São Paulo, BR", t: "ontem às 20:44" },
    { d: "Safari · macOS — Rio de Janeiro, BR", t: "12 jul às 11:03" },
  ];
  return (
    <div className="fade-up dash-page">
      <h2 className="font-display dash-title">Segurança</h2>
      <div className="dash-cols" style={{ marginTop: 20 }}>
        <div className="overview-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><ShieldCheck size={18} color="var(--signal)" /><p style={{ fontWeight: 600, fontSize: 14 }}>Autenticação em dois fatores</p></div>
            <button className={`toggle-switch ${twoFA ? "on" : ""}`} onClick={() => setTwoFA(!twoFA)}><span className="toggle-knob" /></button>
          </div>
          <p style={{ fontSize: 12.5, color: "#8B8A82", marginTop: 8 }}>{twoFA ? "Ativada — pedimos um código extra a cada novo login." : "Desativada — recomendamos manter ligada."}</p>
        </div>
        <div className="overview-card">
          <div className="flex items-center gap-2"><Lock size={18} color="var(--signal)" /><p style={{ fontWeight: 600, fontSize: 14 }}>Senha</p></div>
          <p style={{ fontSize: 12.5, color: "#8B8A82", marginTop: 8 }}>Última alteração há 3 meses.</p>
          <button className="btn-ghost" style={{ marginTop: 12, fontSize: 12.5, padding: "7px 12px" }}>Alterar senha</button>
        </div>
      </div>
      <p className="font-mono overview-label" style={{ marginTop: 26, marginBottom: 10 }}>HISTÓRICO DE ACESSOS</p>
      <div className="mini-list">{acessos.map((a, i) => <div className="agenda-row" key={i}><History size={14} color="#8B8A82" /><span>{a.d}</span><span className="font-mono" style={{ marginLeft: "auto", fontSize: 11, color: "#A6A49B" }}>{a.t}</span></div>)}</div>
    </div>
  );
}

/* =================================================================
   PAINEL ADMINISTRATIVO
==================================================================*/
function AdminPanel({ projects }) {
  const [designers, setDesigners] = useState([
    { id: 1, name: "Bruno Castro", specialty: "Motion design", portfolio: "brunocastro.design", status: "Pendente" },
    { id: 2, name: "Larissa Prado", specialty: "UX/UI design", portfolio: "behance.net/larissaprado", status: "Pendente" },
    { id: 3, name: "Felipe Aragão", specialty: "Ilustração", portfolio: "dribbble.com/felipearagao", status: "Pendente" },
  ]);
  function decide(id, status) { setDesigners((d) => d.map((x) => x.id === id ? { ...x, status } : x)); }
  const projetosAndamento = projects.filter((p) => p.status !== "Aprovado").length;

  return (
    <div className="fade-up dash-page" style={{ maxWidth: 980 }}>
      <h2 className="font-display dash-title">Painel administrativo</h2>
      <p className="dash-sub">Visão geral da operação FORMA</p>
      <div className="stat-grid">
        <div className="stat-card"><p className="font-mono overview-label">CLIENTES ATIVOS</p><p className="stat-value">128</p></div>
        <div className="stat-card"><p className="font-mono overview-label">DESIGNERS ATIVOS</p><p className="stat-value">34</p></div>
        <div className="stat-card"><p className="font-mono overview-label">PROJETOS EM ANDAMENTO</p><p className="stat-value">{projetosAndamento}</p></div>
        <div className="stat-card"><p className="font-mono overview-label">RECEITA DO MÊS</p><p className="stat-value">R$ 42.300</p></div>
      </div>

      <p className="font-mono overview-label" style={{ marginTop: 24, marginBottom: 10 }}>DESIGNERS PENDENTES DE APROVAÇÃO</p>
      <div className="files-list">
        {designers.map((d) => (
          <div className="file-row" key={d.id}>
            <div><p style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</p><p className="font-mono" style={{ fontSize: 11, color: "#8B8A82" }}>{d.specialty} · {d.portfolio}</p></div>
            {d.status === "Pendente" ? (
              <div className="flex gap-2">
                <button className="icon-btn" style={{ background: "var(--mint-soft)", color: "#0E7D63" }} onClick={() => decide(d.id, "Aprovado")}><ThumbsUp size={15} /></button>
                <button className="icon-btn" style={{ background: "#FDEAEA", color: "#C0392B" }} onClick={() => decide(d.id, "Reprovado")}><ThumbsDown size={15} /></button>
              </div>
            ) : (
              <span className="status-pill sm" style={{ background: d.status === "Aprovado" ? "var(--mint-soft)" : "#FDEAEA", color: d.status === "Aprovado" ? "#0E7D63" : "#C0392B" }}>{d.status}</span>
            )}
          </div>
        ))}
      </div>

      <p className="font-mono overview-label" style={{ marginTop: 26, marginBottom: 10 }}>PROJETOS RECENTES</p>
      <div className="files-list">
        {projects.slice(0, 5).map((p) => (
          <div className="file-row" key={p.id}>
            <div><p style={{ fontSize: 13.5, fontWeight: 600 }}>{p.title}</p><p className="font-mono" style={{ fontSize: 11, color: "#8B8A82" }}>{p.client} · {p.designer}</p></div>
            <span className="status-pill sm" style={{ background: STATUS_STYLE[p.status].bg, color: STATUS_STYLE[p.status].fg }}>{p.status}</span>
          </div>
        ))}
      </div>

      <p className="font-mono overview-label" style={{ marginTop: 26, marginBottom: 10 }}>AÇÕES RÁPIDAS</p>
      <div className="flex flex-wrap gap-2">
        {["Gerenciar planos", "Configurar permissões", "Moderar chats", "Emitir relatórios"].map((a) => <button key={a} className="chip-btn"><Gauge size={13} style={{ marginRight: 6 }} />{a}</button>)}
      </div>
    </div>
  );
}

/* =================================================================
   APP DEMO
==================================================================*/
function AppDemo({ onExit, initialRole = "client", initialSection = "overview", justOnboarded = false }) {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [role, setRole] = useState(initialRole);
  const [section, setSection] = useState(initialSection);
  const [activeId, setActiveId] = useState("p1");
  const [tab, setTab] = useState("overview");
  const [draft, setDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const scoped = role === "client" ? projects.filter((p) => p.clientContact === CLIENT_USER) : projects;
    if (scoped.length && !scoped.find((p) => p.id === activeId)) setActiveId(scoped[0].id);
  }, [role, projects]); // eslint-disable-line

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [projects, activeId, tab]);

  const myProjects = role === "client" ? projects.filter((p) => p.clientContact === CLIENT_USER) : projects;
  const currentUser = role === "client" ? CLIENT_USER : role === "designer" ? DESIGNER_USER : "Equipe FORMA";

  function sendMessage() {
    if (!draft.trim()) return;
    setProjects((prev) => prev.map((p) => p.id === activeId ? { ...p, messages: [...p.messages, { from: role, author: currentUser, text: draft.trim(), time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }] } : p));
    setDraft("");
  }
  function setStatus(id, s) { setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: s } : p)); }
  function addDeliverable(id) { setProjects((prev) => prev.map((p) => p.id === id ? { ...p, files: [...p.files, { name: `entrega-v${p.files.length + 1}.pdf`, kind: "entrega", by: p.designer }] } : p)); }
  function goTo(id) { setActiveId(id); setSection("projects"); setTab("overview"); }
  function createProjectFromAI(ai) {
    const id = `p${Date.now()}`;
    setProjects((prev) => [...prev, { id, title: ai.titulo || "Novo projeto", client: "Padaria Trigo & Arte", clientContact: CLIENT_USER, designer: DESIGNER_USER, service: ai.servico || "Social media", priority: "Média", status: "Briefing recebido", briefing: { objetivo: ai.objetivo || "", publico: ai.publico || "", referencias: ai.referencias || "", entregaveis: ai.entregaveis || "", prazo: ai.prazo || "A definir" }, files: [], messages: [] }]);
    setAiOpen(false); setActiveId(id); setSection("projects"); setTab("briefing");
  }

  const clientNav = [{ key: "overview", label: "Visão geral", icon: LayoutGrid }, { key: "projects", label: "Projetos", icon: Layers }, { key: "brand", label: "Biblioteca da marca", icon: Palette }, { key: "finance", label: "Financeiro", icon: Wallet }, { key: "security", label: "Segurança", icon: ShieldCheck }];
  const designerNav = [{ key: "overview", label: "Visão geral", icon: LayoutGrid }, { key: "projects", label: "Projetos", icon: Layers }, { key: "earnings", label: "Ganhos", icon: Wallet }, { key: "ratings", label: "Avaliações", icon: Star }, { key: "security", label: "Segurança", icon: ShieldCheck }];
  const navItems = role === "client" ? clientNav : designerNav;

  return (
    <div className="app-shell">
      <div className="app-topbar">
        <button className="app-back" onClick={onExit}><ArrowLeft size={16} /> <ShapeMark size={18} /> <span className="font-display" style={{ fontWeight: 600 }}>FORMA</span></button>
        <div className="role-switch">
          <button className={role === "client" ? "active" : ""} onClick={() => { setRole("client"); setSection("overview"); }}>Cliente</button>
          <button className={role === "designer" ? "active" : ""} onClick={() => { setRole("designer"); setSection("overview"); }}>Designer</button>
          <button className={role === "admin" ? "active" : ""} onClick={() => { setRole("admin"); setSection("overview"); }}>Admin</button>
        </div>
        <div className="app-user">
          {role === "client" && <button className="icon-btn" onClick={() => setAiOpen(true)} title="Assistente FORMA"><Wand2 size={16} /></button>}
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{currentUser}</span>
          <div className="avatar">{currentUser?.[0]}</div>
        </div>
      </div>

      <div className="app-body-outer">
        {role !== "admin" && (
          <nav className="section-nav">
            {navItems.map(({ key, label, icon: Icon }) => <button key={key} className={`section-nav-item ${section === key ? "active" : ""}`} onClick={() => setSection(key)}><Icon size={16} /> {label}</button>)}
          </nav>
        )}
        <div className="section-content">
          {role === "admin" && <AdminPanel projects={projects} />}
          {role === "client" && section === "overview" && <ClientOverview myProjects={myProjects} onOpenAI={() => setAiOpen(true)} goTo={goTo} />}
          {role === "designer" && section === "overview" && <DesignerOverview myProjects={myProjects} goTo={goTo} />}
          {role === "client" && section === "brand" && <ClientBrand justCreated={justOnboarded} />}
          {role === "client" && section === "finance" && <ClientFinance />}
          {role === "designer" && section === "earnings" && <DesignerEarnings />}
          {role === "designer" && section === "ratings" && <DesignerRatings />}
          {section === "security" && role !== "admin" && <SecurityPage />}
          {section === "projects" && role !== "admin" && (
            <ProjectsSection role={role} projects={myProjects} activeId={activeId} setActiveId={setActiveId} tab={tab} setTab={setTab} sendMessage={sendMessage} draft={draft} setDraft={setDraft} setStatus={setStatus} addDeliverable={addDeliverable} scrollRef={scrollRef} onOpenAI={() => setAiOpen(true)} />
          )}
        </div>
      </div>
      {aiOpen && <AIAssistantModal onClose={() => setAiOpen(false)} onCreateProject={createProjectFromAI} />}
      <StyleSheet />
    </div>
  );
}

/* =================================================================
   ROOT — roteamento entre landing, cadastro, onboarding e app
==================================================================*/
export default function FormaSite() {
  const [view, setView] = useState("home");
  const [appRole, setAppRole] = useState("client");
  const [appSection, setAppSection] = useState("overview");
  const [justOnboarded, setJustOnboarded] = useState(false);

  if (view === "home") return <Landing onEnterApp={() => { setAppRole("client"); setAppSection("overview"); setJustOnboarded(false); setView("app"); }} onSignup={() => setView("signup")} />;
  if (view === "signup") return <SignupFlow onBack={() => setView("home")} onDone={(group) => setView(group === "client" ? "onboarding" : "designerApply")} />;
  if (view === "onboarding") return <OnboardingWizard onComplete={() => { setAppRole("client"); setAppSection("brand"); setJustOnboarded(true); setView("app"); }} />;
  if (view === "designerApply") return <DesignerApplyForm onSubmit={() => setView("designerStatus")} />;
  if (view === "designerStatus") return <DesignerStatusScreen onEnter={() => { setAppRole("designer"); setAppSection("overview"); setView("app"); }} />;
  return <AppDemo onExit={() => setView("home")} initialRole={appRole} initialSection={appSection} justOnboarded={justOnboarded} />;
}

/* =================================================================
   STYLES
==================================================================*/
function StyleSheet() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      :root { --ink:#12121A; --paper:#F5F4F0; --surface:#FFFFFF; --signal:#4B3DF2; --signal-soft:#ECEAFC; --mint:#17C3A2; --mint-soft:#E1F7F2; --amber:#F5A524; --amber-soft:#FDF1DC; --mist:#E6E4DD; --mist-soft:#EFEDE7; }
      .bg-paper { background: var(--paper); } .text-ink { color: var(--ink); }
      .font-display { font-family: 'Fraunces', serif; } .font-mono { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.02em; }
      body, .app-shell, .bg-paper, .flow-shell { font-family: 'Inter', sans-serif; }
      .flex { display: flex; } .items-center { align-items: center; } .justify-between { justify-content: space-between; } .justify-center { justify-content: center; }
      .gap-2 { gap: 8px; } .gap-3 { gap: 12px; } .flex-wrap { flex-wrap: wrap; } .hidden { display: none; }
      @media (min-width: 768px) { .md\\:flex { display: flex; } }

      .shape-mark { display: inline-block; background: linear-gradient(135deg, var(--signal), #8B7CFF); animation: morph 6s ease-in-out infinite; flex-shrink: 0; }
      @keyframes morph { 0%,100%{border-radius:30% 70% 70% 30%/30% 30% 70% 70%;transform:rotate(0deg);} 25%{border-radius:58% 42% 35% 65%/62% 38% 62% 38%;transform:rotate(8deg);} 50%{border-radius:50%;transform:rotate(0deg);} 75%{border-radius:42% 58% 65% 35%/38% 62% 38% 62%;transform:rotate(-8deg);} }
      .spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }

      .nav-wrap { position: sticky; top: 0; z-index: 40; background: rgba(245,244,240,0.85); backdrop-filter: blur(10px); border-bottom: 1px solid var(--mist); }
      .nav-inner { max-width: 1120px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
      .nav-links { gap: 28px; } .nav-links a { font-size: 14px; color: #4A4940; text-decoration: none; } .nav-links a:hover { color: var(--ink); }
      .nav-mobile { display: flex; flex-direction: column; gap: 14px; padding: 16px 24px 22px; border-top: 1px solid var(--mist); } .nav-mobile a { font-size: 14.5px; color: #4A4940; text-decoration: none; }

      .btn-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--ink); color: #fff; border: none; padding: 11px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform .15s ease, background .15s ease; }
      .btn-primary:hover { background: var(--signal); transform: translateY(-1px); } .btn-primary:disabled { opacity: .5; cursor: default; transform: none; }
      .btn-ghost { display: inline-flex; align-items: center; gap: 8px; background: transparent; color: var(--ink); border: 1px solid var(--mist); padding: 10px 17px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; }
      .btn-ghost:hover { border-color: var(--ink); background: var(--surface); }
      .icon-btn { background: none; border: none; cursor: pointer; color: var(--ink); padding: 6px; border-radius: 8px; display: flex; }
      .icon-btn:hover { background: var(--paper); }

      .hero-wrap { max-width: 1120px; margin: 0 auto; padding: 64px 24px 40px; }
      .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; }
      @media (max-width: 900px) { .hero-grid { grid-template-columns: 1fr; } }
      .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; letter-spacing: .08em; color: var(--signal); font-weight: 500; }
      .hero-title { font-size: 54px; line-height: 1.03; font-weight: 600; letter-spacing: -.01em; margin: 18px 0 20px; }
      @media (max-width: 640px) { .hero-title { font-size: 38px; } }
      .hero-sub { font-size: 16.5px; line-height: 1.6; color: #4A4940; max-width: 480px; }
      .hero-audience { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 30px; }
      .chip-mono { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; padding: 6px 10px; border: 1px solid var(--mist); border-radius: 6px; color: #6B6A72; }
      .hero-visual { position: relative; display: flex; align-items: center; justify-content: center; min-height: 320px; }
      .blob { position: absolute; width: 300px; height: 300px; background: radial-gradient(circle at 30% 30%, #8B7CFF 0%, var(--signal) 55%, transparent 75%); opacity: .16; filter: blur(10px); animation: morph 8s ease-in-out infinite; }
      .hero-card { position: relative; background: var(--surface); border: 1px solid var(--mist); border-radius: 18px; padding: 22px; width: 280px; box-shadow: 0 24px 60px -24px rgba(18,18,26,.2); }
      .ai-preview-field { background: var(--paper); border-radius: 10px; padding: 10px 12px; }
      .mini-steps { display: flex; gap: 5px; } .mini-step { height: 5px; flex: 1; border-radius: 3px; background: var(--mist); } .mini-step.done { background: var(--signal); }
      .status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 999px; }
      .status-pill.sm { font-size: 11px; padding: 4px 8px; } .dot { width: 6px; height: 6px; border-radius: 50%; }

      .section { max-width: 1120px; margin: 0 auto; padding: 88px 24px; }
      .section-tint { background: var(--surface); max-width: 100%; border-top: 1px solid var(--mist); border-bottom: 1px solid var(--mist); }
      .section-tint > * { max-width: 1120px; margin-left: auto; margin-right: auto; }
      .section-title { font-size: 32px; font-weight: 600; letter-spacing: -.005em; margin-top: 14px; max-width: 640px; line-height: 1.2; }
      .ia-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 44px; }
      @media (max-width: 900px) { .ia-grid { grid-template-columns: 1fr 1fr; } } @media (max-width: 560px) { .ia-grid { grid-template-columns: 1fr; } }
      .ia-card { background: var(--paper); border: 1px solid var(--mist); border-radius: 14px; padding: 20px; }
      .services-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 44px; }
      @media (max-width: 900px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
      .service-chip { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: var(--paper); border: 1px solid var(--mist); border-radius: 10px; font-size: 13.5px; color: #3C3B42; }
      .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 44px; } @media (max-width: 900px) { .plans-grid { grid-template-columns: 1fr; } }
      .plan-card { position: relative; background: var(--surface); border: 1px solid var(--mist); border-radius: 16px; padding: 28px; }
      .plan-featured { border-color: var(--ink); box-shadow: 0 20px 40px -24px rgba(18,18,26,.3); }
      .plan-badge { position: absolute; top: -11px; left: 28px; background: var(--ink); color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 4px 9px; border-radius: 999px; }
      .plan-name { font-size: 19px; font-weight: 600; margin-bottom: 6px; } .plan-desc { font-size: 13.5px; color: #6B6A72; margin-bottom: 18px; min-height: 40px; }
      .plan-price { font-size: 28px; font-weight: 600; margin-bottom: 20px; } .plan-price span { font-size: 13px; font-weight: 400; color: #8B8A82; }
      .plan-list { list-style: none; padding: 0; margin: 0 0 22px; display: flex; flex-direction: column; gap: 10px; } .plan-list li { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: #3C3B42; } .plan-list li svg { color: var(--mint); flex-shrink: 0; }
      .cta-final { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 100px 24px; } .cta-title { font-size: 34px; font-weight: 600; }
      .footer { max-width: 1120px; margin: 0 auto; padding: 24px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--mist); }
      .fade-up { animation: fadeUp .4s ease both; } @keyframes fadeUp { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }

      /* FLOWS: signup, onboarding, designer apply/status */
      .flow-shell { min-height: 100vh; background: var(--paper); color: var(--ink); }
      .flow-topbar { padding: 16px 24px; }
      .flow-body { display: flex; align-items: center; justify-content: center; padding: 20px 24px 60px; min-height: calc(100vh - 60px); }
      .flow-card { background: var(--surface); border: 1px solid var(--mist); border-radius: 20px; padding: 32px; width: 100%; max-width: 560px; box-shadow: 0 30px 70px -30px rgba(18,18,26,.25); }
      .flow-title { font-size: 24px; font-weight: 600; margin: 10px 0 6px; line-height: 1.25; }
      .type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 18px; }
      .type-card { display: flex; align-items: center; gap: 10px; background: var(--paper); border: 1px solid var(--mist); border-radius: 12px; padding: 14px; font-size: 13.5px; cursor: pointer; text-align: left; color: var(--ink); }
      .type-card.selected { border-color: var(--signal); background: var(--signal-soft); color: var(--signal); }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; } @media (max-width: 520px) { .form-grid { grid-template-columns: 1fr; } }
      .field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #6B6A72; }
      .field input, .field select, .field textarea { border: 1px solid var(--mist); border-radius: 10px; padding: 10px 12px; font-size: 13.5px; font-family: 'Inter', sans-serif; outline: none; color: var(--ink); background: var(--surface); }
      .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--signal); }
      .checkbox-row { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #6B6A72; margin-top: 16px; }
      .wizard-progress { display: flex; gap: 5px; margin: 16px 0 22px; }
      .swatch-pick { width: 40px; height: 40px; border-radius: 10px; border: none; cursor: pointer; }
      .success-banner { display: flex; align-items: center; gap: 8px; background: var(--mint-soft); color: #0E7D63; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; }
      .approval-pipeline { display: flex; flex-direction: column; gap: 14px; margin-top: 18px; }
      .approval-step { display: flex; align-items: center; gap: 12px; }

      /* APP */
      .app-shell { min-height: 100vh; background: var(--paper); color: var(--ink); display: flex; flex-direction: column; }
      .app-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 22px; background: var(--surface); border-bottom: 1px solid var(--mist); gap: 16px; flex-wrap: wrap; }
      .app-back { display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; color: var(--ink); font-size: 14px; }
      .role-switch { display: flex; background: var(--paper); border: 1px solid var(--mist); border-radius: 999px; padding: 3px; }
      .role-switch button { border: none; background: none; padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 500; color: #6B6A72; cursor: pointer; }
      .role-switch button.active { background: var(--ink); color: #fff; }
      .app-user { display: flex; align-items: center; gap: 10px; }
      .avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--signal); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
      .avatar.sm { width: 24px; height: 24px; font-size: 11px; flex-shrink: 0; }
      .app-body-outer { flex: 1; display: grid; grid-template-columns: 220px 1fr; } @media (max-width: 800px) { .app-body-outer { grid-template-columns: 1fr; } }
      .section-nav { background: var(--surface); border-right: 1px solid var(--mist); padding: 18px 12px; display: flex; flex-direction: column; gap: 3px; }
      @media (max-width: 800px) { .section-nav { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--mist); } }
      .section-nav-item { display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; color: #6B6A72; cursor: pointer; text-align: left; white-space: nowrap; }
      .section-nav-item.active { background: var(--paper); color: var(--ink); font-weight: 600; }
      .section-content { padding: 26px 30px 50px; overflow-y: auto; }
      .dash-page { max-width: 900px; } .dash-title { font-size: 26px; font-weight: 600; } .dash-sub { font-size: 13.5px; color: #8B8A82; margin-top: 2px; }
      .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; } @media (max-width: 700px) { .stat-grid { grid-template-columns: 1fr 1fr; } }
      .stat-card { background: var(--surface); border: 1px solid var(--mist); border-radius: 12px; padding: 16px; }
      .stat-value { font-size: 22px; font-weight: 600; margin-top: 6px; font-family: 'Fraunces', serif; }
      .ai-banner { display: flex; align-items: center; justify-content: space-between; width: 100%; background: var(--ink); color: #fff; border: none; border-radius: 14px; padding: 16px 20px; cursor: pointer; margin-bottom: 26px; }
      .ai-banner:hover { background: var(--signal); }
      .dash-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; } @media (max-width: 700px) { .dash-cols { grid-template-columns: 1fr; } }
      .mini-list { display: flex; flex-direction: column; gap: 8px; }
      .mini-row { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--mist); border-radius: 10px; padding: 11px 14px; font-size: 13.5px; cursor: pointer; text-align: left; color: var(--ink); }
      .agenda-row { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--mist); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
      .review-row { background: var(--surface); border: 1px solid var(--mist); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
      .swatch-row { display: flex; gap: 14px; flex-wrap: wrap; } .swatch { display: flex; flex-direction: column; gap: 4px; width: 120px; } .swatch-color { width: 100%; height: 64px; border-radius: 10px; border: 1px solid var(--mist); }
      .goal-bar { height: 8px; background: var(--mist); border-radius: 999px; overflow: hidden; margin-top: 8px; } .goal-fill { height: 100%; background: var(--mint); border-radius: 999px; }
      .bar-chart { display: flex; align-items: flex-end; gap: 14px; height: 110px; } .bar-col { display: flex; flex-direction: column; align-items: center; gap: 6px; justify-content: flex-end; }
      .bar { width: 20px; background: linear-gradient(180deg, var(--signal), #8B7CFF); border-radius: 5px 5px 0 0; }
      .toggle-switch { width: 42px; height: 24px; border-radius: 999px; background: var(--mist); border: none; position: relative; cursor: pointer; flex-shrink: 0; }
      .toggle-switch.on { background: var(--signal); }
      .toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .15s ease; }
      .toggle-switch.on .toggle-knob { left: 21px; }

      .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--mist); margin-bottom: 24px; }
      .tab { background: none; border: none; padding: 10px 14px; font-size: 13.5px; color: #8B8A82; cursor: pointer; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px; }
      .tab.active { color: var(--ink); border-bottom-color: var(--signal); font-weight: 600; }
      .tab-badge { background: var(--mist); color: #6B6A72; font-size: 10.5px; padding: 1px 6px; border-radius: 999px; }
      .projects-layout { display: grid; grid-template-columns: 260px 1fr; gap: 26px; } @media (max-width: 900px) { .projects-layout { grid-template-columns: 1fr; } }
      .app-sidebar-inner { display: flex; flex-direction: column; gap: 12px; } .sidebar-label { font-size: 10.5px; color: #A6A49B; }
      .ai-cta { display: flex; align-items: center; gap: 8px; background: var(--signal-soft); color: var(--signal); border: 1px dashed var(--signal); border-radius: 10px; padding: 10px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
      .project-list { display: flex; flex-direction: column; gap: 8px; }
      .project-item { text-align: left; background: var(--surface); border: 1px solid var(--mist); border-radius: 10px; padding: 12px; cursor: pointer; } .project-item.active { border-color: var(--ink); }
      .priority-dot { width: 7px; height: 7px; border-radius: 50%; } .priority-Alta { background: #E14A3D; } .priority-Média { background: var(--amber); } .priority-Baixa { background: var(--mist); }
      .app-main-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
      .pipeline { display: flex; align-items: center; margin-bottom: 30px; }
      .pipeline-item { display: flex; align-items: center; flex: 1; } .pipeline-item:last-child { flex: 0; }
      .pipeline-dot { width: 22px; height: 22px; border-radius: 50%; background: var(--mist); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
      .pipeline-dot.done { background: var(--mint); } .pipeline-dot.current { background: var(--signal); }
      .pipeline-label { font-size: 11.5px; color: #A6A49B; margin: 0 10px; white-space: nowrap; } .pipeline-label.done { color: var(--ink); font-weight: 500; }
      .pipeline-line { height: 2px; flex: 1; background: var(--mist); } .pipeline-line.done { background: var(--mint); }
      .overview-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; } @media (max-width: 700px) { .overview-grid { grid-template-columns: 1fr; } }
      .overview-card { background: var(--surface); border: 1px solid var(--mist); border-radius: 12px; padding: 18px; }
      .overview-label { font-size: 10.5px; color: #A6A49B; margin-bottom: 8px; }
      .actions-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .chip-btn { background: var(--surface); border: 1px solid var(--mist); padding: 8px 13px; border-radius: 999px; font-size: 12.5px; cursor: pointer; color: #4A4940; display: inline-flex; align-items: center; }
      .chip-btn-active { background: var(--ink); color: #fff; border-color: var(--ink); }
      .briefing-view { display: flex; flex-direction: column; gap: 18px; max-width: 640px; }
      .briefing-field { background: var(--surface); border: 1px solid var(--mist); border-radius: 12px; padding: 16px 18px; }
      .files-list { display: flex; flex-direction: column; gap: 8px; max-width: 700px; }
      .file-row { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--mist); border-radius: 10px; padding: 12px 14px; gap: 12px; }
      .file-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--paper); display: flex; align-items: center; justify-content: center; color: #6B6A72; }
      .chat-view { display: flex; flex-direction: column; max-width: 640px; height: 420px; background: var(--surface); border: 1px solid var(--mist); border-radius: 14px; overflow: hidden; }
      .chat-thread { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
      .bubble-row { display: flex; gap: 8px; max-width: 85%; } .bubble-row.mine { align-self: flex-end; flex-direction: row-reverse; }
      .bubble { background: var(--paper); border-radius: 12px; padding: 9px 12px; } .bubble-row.mine .bubble { background: var(--signal-soft); }
      .chat-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--mist); }
      .chat-input { flex: 1; border: 1px solid var(--mist); border-radius: 999px; padding: 10px 16px; font-size: 13.5px; outline: none; font-family: 'Inter', sans-serif; } .chat-input:focus { border-color: var(--signal); }
      .send-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--ink); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; } .send-btn:hover { background: var(--signal); }
      .modal-overlay { position: fixed; inset: 0; background: rgba(18,18,26,.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
      .modal-card { background: var(--surface); border-radius: 18px; padding: 24px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; box-shadow: 0 30px 80px -20px rgba(18,18,26,.4); }
      .ai-textarea { width: 100%; border: 1px solid var(--mist); border-radius: 12px; padding: 12px 14px; font-size: 13.5px; font-family: 'Inter', sans-serif; resize: vertical; outline: none; } .ai-textarea:focus { border-color: var(--signal); }
      .ai-result { background: var(--paper); border-radius: 12px; padding: 16px; }

      @media (prefers-reduced-motion: reduce) { .shape-mark, .blob { animation: none; } .fade-up { animation: none; } .spin { animation: none; } }
    `}</style>
  );
}
