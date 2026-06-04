import { z } from 'npm:zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  exercise: z.string().min(1).max(200).trim(),
});

const ExerciseAIProfileSchema = z.object({
  muscles: z.array(z.object({
    name: z.string(),
    activationPct: z.number().min(0).max(100),
    tier: z.enum(['primary', 'secondary', 'tertiary']),
  })).min(1),
  formCues: z.array(z.string()).min(1),
  hypertrophy: z.object({
    repRange: z.string(),
    sets: z.string(),
    rir: z.string(),
    tempo: z.string(),
  }),
});

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

  const body = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return new Response(JSON.stringify({ error: body.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { exercise } = body.data;

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brutl.app',
      'X-Title': 'BRUTL',
    },
    body: JSON.stringify({
      model: 'openrouter/owl-alpha',
      max_tokens: 512,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Exercise: ${exercise}` },
      ],
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'AI request failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? '';

  try {
    const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const profile = ExerciseAIProfileSchema.parse(parsed);
    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
