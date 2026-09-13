import { base44 } from "@/api/base44Client";

export async function logInteraction({ customer_id, customer_name, type, description, actor_name }) {
  try {
    await base44.entities.CustomerInteraction.create({
      customer_id,
      customer_name: customer_name || "",
      type,
      description,
      actor_name: actor_name || "Admin",
    });
  } catch (e) {
    console.error("Failed to log interaction:", e);
  }
}