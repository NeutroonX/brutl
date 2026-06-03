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
