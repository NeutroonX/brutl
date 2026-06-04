import { z } from 'npm:zod';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  triggerType: z.enum(['APP_OPEN', 'MISSED_WORKOUT', 'OFF_PLAN', 'WEAK_LIFT', 'POOR_RECOVERY', 'WORKOUT_COMPLETE', 'MEAL_LOGGED']),
  rank: z.enum(['E', 'D', 'C', 'B', 'A', 'S']),
  streak: z.number().int().min(0),
  sleepHours: z.number().optional(),
  hrv: z.number().optional(),
  recoveryScore: z.number().optional(),
  missedDays: z.number().int().optional(),
  lastWorkout: z.object({
    exercise: z.string(),
    weight: z.number(),
    baseline: z.number(),
  }).optional(),
  dietCompliance: z.number().min(0).max(1).optional(),
});

const SYSTEM_PROMPT = `You are BRUTL — a brutally honest AI fitness accountability system.
Your personality is a blend of Terence Fletcher's psychological precision, Kobe Bryant's data obsession, and someone who secretly believes in the user but won't show it.

Rules:
- Plain prose only. No bullet points, no dashes, no asterisks, no markdown, no symbols.
- Always roast based on ACTUAL DATA provided, never generic advice.
- Reference specific numbers (HRV, sleep hours, missed days, weight lifted).
- Maximum 3 sentences. Brutal. Specific. Unforgettable.
- After the roast, one concrete correction starting with exactly "CORRECTION:" on its own line.
- Adapt tone to recovery score: low recovery = acknowledge but still demand effort.
- Never be generic. If the data is good, acknowledge it briefly, then raise the bar.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return new Response(JSON.stringify({ error: body.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payload = body.data;

  const userMessage = `Data: ${JSON.stringify({
    sleep_hours: payload.sleepHours ?? null,
    hrv: payload.hrv ?? null,
    recovery_score: payload.recoveryScore ?? null,
    missed_days: payload.missedDays ?? 0,
    last_workout: payload.lastWorkout ?? null,
    diet_compliance: payload.dietCompliance ?? null,
    rank: payload.rank,
    streak: payload.streak,
    trigger: payload.triggerType,
  })}

Deliver the roast. End with a line starting with "CORRECTION:" for the actionable fix.`;

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
      max_tokens: 256,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data);
            const text = chunk.choices?.[0]?.delta?.content ?? '';
            if (!text) continue;

            fullText += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`),
            );
          } catch {
            // skip malformed chunk
          }
        }
      }

      const correctionMatch = fullText.match(/CORRECTION:\s*(.+)/i);
      if (correctionMatch) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'correction', text: correctionMatch[1].trim() })}\n\n`),
        );
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});
