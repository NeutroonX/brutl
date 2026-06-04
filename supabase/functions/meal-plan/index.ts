import { z } from 'npm:zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  phase: z.enum(['BULK', 'CUT', 'MAINTAIN']),
  dayType: z.enum(['HIGH', 'MODERATE', 'LOW']),
  macroTargets: z.object({
    calories: z.number().int().min(1000).max(6000),
    proteinG: z.number().int().min(50).max(500),
    carbsG: z.number().int().min(0).max(1000),
    fatG: z.number().int().min(20).max(300),
  }),
  preferences: z.object({
    mealsPerDay: z.number().int().min(2).max(6).default(4),
    excludeIngredients: z.array(z.string()).max(20).optional(),
  }).optional(),
});

const MealSuggestionSchema = z.object({
  name: z.string(),
  timeOfDay: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  ingredients: z.array(z.string()),
  prepMinutes: z.number(),
});

const MealPlanResponseSchema = z.object({
  dayType: z.enum(['HIGH', 'MODERATE', 'LOW']),
  totalCalories: z.number(),
  totalProteinG: z.number(),
  totalCarbsG: z.number(),
  totalFatG: z.number(),
  meals: z.array(MealSuggestionSchema).min(2).max(6),
  coachNote: z.string(),
});

const SYSTEM_PROMPT = `You are BRUTL — a brutally efficient nutrition coach. No fluff, only results.

Given the user's diet phase, macro cycling day type, and exact macro targets, generate a practical daily meal plan.

Return ONLY a JSON object in this exact shape — no markdown, no explanation:
{
  "dayType": "HIGH|MODERATE|LOW",
  "totalCalories": number,
  "totalProteinG": number,
  "totalCarbsG": number,
  "totalFatG": number,
  "coachNote": "string (1 sentence, blunt and motivational)",
  "meals": [
    {
      "name": "string",
      "timeOfDay": "breakfast|lunch|dinner|snack",
      "calories": number,
      "proteinG": number,
      "carbsG": number,
      "fatG": number,
      "ingredients": ["string"],
      "prepMinutes": number
    }
  ]
}

Rules:
- Meal totals must sum to within 5% of the target macros.
- Prioritise whole foods. No supplements listed as meals.
- Protein must be distributed across all meals (no single meal > 50% of daily protein).
- HIGH day: carbs come from rice, oats, potatoes, fruit. LOW day: replace with vegetables and healthy fats.
- Keep it practical — meals under 30 min prep unless it's dinner.
- BULK phase: prioritise calorie density. CUT phase: prioritise volume and satiety. MAINTAIN: balanced.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return new Response(JSON.stringify({ error: body.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { phase, dayType, macroTargets, preferences } = body.data;
  const mealsPerDay = preferences?.mealsPerDay ?? 4;
  const excludes = preferences?.excludeIngredients?.join(', ') ?? 'none';

  const userMessage = `Diet phase: ${phase}
Cycling day type: ${dayType}
Target macros: ${macroTargets.calories} kcal | ${macroTargets.proteinG}g protein | ${macroTargets.carbsG}g carbs | ${macroTargets.fatG}g fat
Meals per day: ${mealsPerDay}
Exclude ingredients: ${excludes}

Generate the meal plan now.`;

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
      max_tokens: 1200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
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
    const parsed = MealPlanResponseSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Schema validation failed', raw }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(parsed.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
