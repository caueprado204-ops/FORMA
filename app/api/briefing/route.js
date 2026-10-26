export async function POST(req) {
  const { description } = await req.json();

  if (!description || !description.trim()) {
    return Response.json({ error: "Descrição vazia." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  const prompt = `Você é o assistente de briefing da FORMA, uma plataforma de design as a service. Transforme a descrição livre do cliente em um briefing estruturado, em português do Brasil. Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{"titulo": "string curta", "servico": "string curta, ex: Social media, Branding & identidade, Sites & landing pages, Motion design, Copywriting", "objetivo": "1-2 frases", "publico": "1 frase", "referencias": "1 frase", "entregaveis": "1 frase", "prazo": "ex: 5 dias úteis"}

Descrição do cliente: "${description.trim()}"`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Anthropic API: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) return Response.json({ error: "Resposta vazia." }, { status: 502 });

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return Response.json(parsed);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
