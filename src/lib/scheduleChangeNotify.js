import { base44 } from "@/api/base44Client";

// Fire-and-forget: a failed notification never blocks the calendar action itself
export function notifyScheduleChange(payload) {
  return base44.functions
    .invoke("notifyScheduleChange", payload)
    .catch((e) => console.error("Schedule change notification failed", e));
}