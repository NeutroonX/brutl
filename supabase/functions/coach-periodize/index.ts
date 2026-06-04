import { z } from 'npm:zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ExerciseSetSchema = z.object({
  exercise: z.string(),
  sets: z.number(),
  reps: z.number(),
  weightKg: z.number(),
});

const WorkoutLogSchema = z.object({
  id: z.string(),
  date: z.number(),
  exercises: z.array(ExerciseSetSchema),
  durationMinutes: z.number(),
  xpEarned: z.number(),
});

const RequestSchema = z.object({
  logs: z.array(WorkoutLogSchema).max(56),
  profile: z.object({
    goal: z.enum(['FAT_LOSS', 'MUSCLE_GAIN', 'RECOMP']),
    rank: z.enum(['E', 'D', 'C', 'B', 'A', 'S']),
    streakDays: z.number(),
    weakArea: z.array(z.string()),
  }),
});

const SYSTEM_PROMPT = `You are BRUTL — a brutally data-driven periodization coach. Fletcher's discipline, Kobe's obsession with marginal gains.

Given the user's recent workout logs and profile, generate a 4-week progressive overload plan.

Return ONLY a JSON object in this exact shape — no markdown, no explanation:
{
  "summary": "string (1-2 sentences, blunt assessment of their current state and the plan's goal)",
  "weeks": [
    {
      "week": 1,
      "focus": "string (e.g. Volume Accumulation, Intensity Ramp, Peak, Deload)",
      "adjustments": [
        {
          "exercise": "string",
          "targetSets": number,
          "targetReps": "string (e.g. 8-10)",
          "targetWeightKg": number,
          "rationale": "string (1 sentence, specific to their data)"
        }
      ]
    }
  ],
  "overloadRecs": [
    {
      "exercise": "string",
      "currentAvgKg": number,
      "recommendedKg": number,
      "rationale": "string"
    }
  ],
  "recoveryNotes": "string (1-2 sentences on recovery, sleep, deload timing)"
}

Rules:
- Base all numbers on the actual data provided. Never fabricate lifts not in the logs.
- Overload by 2.5-5kg on compound lifts per 2 weeks if no stall detected.
- Week 4 is always a deload: volume -40%, intensity -10%.
- If logs are sparse (< 4 sessions), note this in summary and give conservative recs.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return new Response(JSON.stringify({ error: body.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { logs, profile } = body.data;

  const perExercise: Record<string, number[]> = {};
  for (const log of logs) {
    for (const ex of log.exercises) {
      if (!perExercise[ex.exercise]) perExercise[ex.exercise] = [];
      perExercise[ex.exercise].push(ex.weightKg);
    }
  }
  const avgByExercise = Object.fromEntries(
    Object.entries(perExercise).map(([name, weights]) => [
      name,
      Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10,
    ]),
  );

  const userMessage = `User profile: goal=${profile.goal}, rank=${profile.rank}, streak=${profile.streakDays} days, weak areas=${profile.weakArea.join(', ')}.

Recent workout summary (${logs.length} sessions):
${JSON.stringify(avgByExercise, null, 2)}

Full log (last ${Math.min(logs.length, 8)} sessions):
${JSON.stringify(logs.slice(-8).map((l) => ({ date: l.date, exercises: l.exercises })), null, 2)}

Build the 4-week periodization plan.`;

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
      max_tokens: 1024,
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
    const plan = JSON.parse(cleaned);
    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Parse failed', raw }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
