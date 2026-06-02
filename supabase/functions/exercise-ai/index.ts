const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `You are a sports science AI. Given an exercise name, return ONLY a JSON object with this exact shape:
{
  "muscles": [
    { "name": "string (specific head e.g. Triceps (Long), Quad (VMO))", "activationPct": number, "tier": "primary|secondary|tertiary" }
  ],
  "formCues": ["string", "string", "string", "string"],
  "hypertrophy": { "repRange": "e.g. 8-12", "sets": "e.g. 3-4", "rir": "e.g. 2-3", "tempo": "e.g. 2-1-2" }
}
List 3-6 muscles by activation order, specific heads where applicable. No markdown, no explanation, just JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { exercise } = await req.json();
  if (!exercise) return new Response(JSON.stringify({ error: 'Missing exercise' }), { status: 400, headers: corsHeaders });

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brutl.app',
      'X-Title': 'BRUTL',
    },
    body: JSON.stringify({
      model: 'nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8',
      max_tokens: 512,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Exercise: ${exercise}` },
      ],
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 502, headers: corsHeaders });
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const profile = JSON.parse(cleaned);
    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw }), { status: 502, headers: corsHeaders });
  }
});
