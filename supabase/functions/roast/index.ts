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
              encoder.encode(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`)
            );
          } catch {
            // skip malformed chunk
          }
        }
      }

      const correctionMatch = fullText.match(/CORRECTION:\s*(.+)/i);
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
