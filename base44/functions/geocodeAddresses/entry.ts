import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { addresses } = await req.json();
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return Response.json({ error: 'addresses array is required' }, { status: 400 });
    }

    const addressList = addresses.map((a, i) => `${i + 1}. ${a}`).join("\n");
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `For each street address below in San Angelo, Texas, provide:
1. Approximate latitude and longitude (San Angelo center is ~31.3739, -100.4407; spread across the city based on street locations)
2. The specific neighborhood or area name (e.g., "College Hills", "Santa Fe Crossing", "Bryant District", "Lake View", "Belaire", "Southland", "Grape Creek", "PaulAnn", "Millbrook", "Knickerbocker", "Sanchez", "Renaissance")

Use real San Angelo neighborhood names. If uncertain, use the nearest known neighborhood or the nearest major street/landmark as the area name.

Addresses:
${addressList}

Return each address with its coordinates and neighborhood.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          locations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                address: { type: "string" },
                lat: { type: "number" },
                lng: { type: "number" },
                neighborhood: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ locations: res?.locations || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}