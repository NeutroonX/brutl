import { z } from 'npm:zod';

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MacrosSchema = z.object({
  name: z.string().max(80),
  calories: z.number().min(0).max(9999),
  proteinG: z.number().min(0).max(999),
  carbsG: z.number().min(0).max(999),
  fatG: z.number().min(0).max(999),
  servingG: z.number().min(0).max(9999),
});

const PROMPT = `Look at this meal photo and estimate the nutritional content for the full portion visible.

Return ONLY valid JSON with these exact keys, no markdown, no explanation:
{
  "name": "short descriptive meal name (max 40 chars)",
  "calories": number,
  "proteinG": number,
  "carbsG": number,
  "fatG": number,
  "servingG": number
}

Be realistic. If you can't identify the food, make your best estimate based on what you can see.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: image } },
            { text: PROMPT },
          ],
        }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'No JSON in response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = MacrosSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid AI response shape' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
