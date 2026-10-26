# FORMA — Plataforma (protótipo)

Site + demo funcional da FORMA, pronto para publicar no Vercel.

## O que está aqui

- `app/page.jsx` — carrega o site (`components/FormaSite.jsx`): landing, cadastro, onboarding, dashboards de cliente/designer/admin.
- `app/api/briefing/route.js` — rota de servidor que chama a API da Anthropic para o Assistente de Briefing com IA, mantendo a chave protegida (nunca exposta no navegador).

## Como publicar no Vercel

**Opção 1 — pelo site, sem usar terminal**
1. Crie um repositório no GitHub e suba esta pasta inteira nele.
2. Acesse [vercel.com/new](https://vercel.com/new) e importe esse repositório.
3. Antes de clicar em "Deploy", abra **Environment Variables** e adicione:
   - `ANTHROPIC_API_KEY` = sua chave, gerada em [console.anthropic.com](https://console.anthropic.com/)
4. Clique em Deploy. Em cerca de 1 minuto você recebe uma URL pública (`algo.vercel.app`).

**Opção 2 — pelo terminal (Vercel CLI)**
```bash
npm i -g vercel
cd forma-vercel
vercel
# na primeira pergunta, confirme criar um novo projeto
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

## Rodando localmente antes de publicar (opcional)

```bash
npm install
cp .env.example .env.local
# edite .env.local e cole sua ANTHROPIC_API_KEY
npm run dev
```
Abra http://localhost:3000

## Observações

- Sem a `ANTHROPIC_API_KEY` configurada, todo o site funciona normalmente — só o botão **"Criar projeto com IA"** mostra uma mensagem de erro amigável.
- Os dados (projetos, mensagens, faturas etc.) são mockados em memória, para fins de demonstração — nada é salvo em banco de dados ainda. Isso está descrito como próximo passo no documento de arquitetura da FORMA.
