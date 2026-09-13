import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a lawn care business owner writing a text message preset to send to a customer. Write a short, friendly text message for this scenario: "${prompt}". The message should be warm and professional. Use {name} as a placeholder where the customer's name should go. Keep it under 2 sentences. Also provide a short title (3-5 words).`,
      response_json_schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          title: { type: "string" },
        },
      },
    });

    return Response.json({ message: result?.message || "", title: result?.title || "" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}