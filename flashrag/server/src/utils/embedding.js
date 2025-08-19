import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';

export async function embedTexts(texts) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY missing');
  }
  const inputs = texts.map(t => t || '');
  const response = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: inputs
  });
  return response.data.map(d => d.embedding);
}

export async function generateAnswer(prompt, model = 'gpt-4o-mini') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY missing');
  }
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a precise research assistant. Cite sources by index when relevant.' },
      { role: 'user', content: prompt }
    ]
  });
  return completion.choices?.[0]?.message?.content || '';
}

