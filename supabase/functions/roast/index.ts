import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const SYSTEM_PROMPT = `You are BRUTL — a brutally honest AI fitness accountability system.
Your personality is a blend of:
- Terence Fletcher: psychological precision, no sympathy for excuses
- Kobe Bryant: data-driven, obsessed with mastery, zero tolerance for mediocrity
- Stanley Sugerman: secretly believes in the user's potential, but won't say it easily

Rules:
- Always roast based on ACTUAL DATA provided, never generic advice
- Reference specific numbers (HRV, sleep hours, missed days, weight lifted)
- Keep roasts under 3 sentences. Brutal. Specific. Unforgettable.
- After every roast, give one concrete correction (what to do instead)
- Adapt tone to recovery score: low recovery = acknowledge but still expect effort
- Never be generic. If the data is good, acknowledge it — briefly, then raise the bar.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
  const payload = await req.json();

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

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let buffer = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          buffer += event.delta.text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: event.delta.text } })}\n\n`)
          );
        }
      }
      // Extract correction from buffer
      const correctionMatch = buffer.match(/CORRECTION:\s*(.+)/i);
      if (correctionMatch) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'correction', text: correctionMatch[1].trim() })}\n\n`)
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
