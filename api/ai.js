export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured. Add it in Vercel Settings > Environment Variables.' });
  }

  try {
    const { max_tokens, system, messages } = req.body;

    const msgs = [];
    if (system) msgs.push({ role: 'system', content: system });
    if (messages && messages.length > 0) {
      for (const m of messages) {
        msgs.push({ role: m.role, content: m.content });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: max_tokens || 1000,
        messages: msgs,
      }),
    });

    const raw = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: raw });
    }

    const data = JSON.parse(raw);

    return res.status(200).json({
      content: [{ type: 'text', text: data.choices[0].message.content }],
      usage: {
        input_tokens: data.usage.prompt_tokens,
        output_tokens: data.usage.completion_tokens,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
