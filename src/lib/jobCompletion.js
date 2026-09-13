import { getNextRecurringDate, PROMOTION_PATH, PROMOTION_THRESHOLDS, getJobEmployeePay } from "@/lib/lawnCare";
import { logInteraction } from "@/lib/interactionLog";

// Shared job completion flow used by BOTH the admin Jobs page and the
// Employee Portal: marks the job done, creates the invoice for the owner,
// credits the employee (reliability, yards, reward, promotion), logs the
// labor expense, and schedules the next recurring occurrence.
export function startJob(job, updateJob) {
  updateJob({ id: job.id, status: "in_progress", timer_started_at: new Date().toISOString() });
}

export function runJobCompletion(job, { employees = [], jobs = [], updateJob, createInvoice, createExpense, updateEmployee, createNextJob }) {
  const updates = { status: "completed", completed_date: new Date().toISOString() };
  if (job.timer_started_at) {
    updates.timer_duration_seconds = Math.round((Date.now() - new Date(job.timer_started_at)) / 1000);
  }
  updateJob({ id: job.id, ...updates });

  // Invoice to the owner for this job
  createInvoice({
    job_id: job.id,
    customer_id: job.customer_id,
    customer_name: job.customer_name,
    amount: job.price || 0,
    status: "unpaid",
    description: job.job_type,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });

  // Credit the assigned employee + log what they're owed
  const empId = job.claimed_by_employee_id || job.exclusive_to_employee_id;
  const emp = empId ? employees.find((e) => e.id === empId) : null;
  if (emp) {
    const empUpdates = {
      reliability_score: Math.min((emp.reliability_score ?? 100) + 5, 100),
      yards_completed: (emp.yards_completed ?? 0) + 1,
      reward_progress: (emp.reward_progress ?? 0) + 1,
    };
    const completedCount = jobs.filter(
      (j) => j.status === "completed" && (j.claimed_by_employee_id === emp.id || j.exclusive_to_employee_id === emp.id)
    ).length + 1;
    const threshold = PROMOTION_THRESHOLDS[emp.role];
    const nextRole = PROMOTION_PATH[emp.role];
    if (threshold && nextRole && completedCount >= threshold) {
      empUpdates.role = nextRole;
    }
    updateEmployee({ id: emp.id, ...empUpdates });

    const owed = getJobEmployeePay(job);
    if (owed > 0) {
      createExpense({
        amount: owed,
        category: "labor",
        vendor: emp.name,
        description: job.customer_name,
        date: new Date().toISOString().slice(0, 10),
        paid: false,
      });
    }
  }

  // Schedule the next occurrence for recurring jobs
  if (["weekly", "biweekly", "monthly"].includes(job.recurring_rule)) {
    const nextDate = getNextRecurringDate(job.scheduled_date, job.recurring_rule);
    if (nextDate) {
      const nextDateStr = nextDate.slice(0, 10);
      const alreadyScheduled = jobs.some((j) => j.customer_id === job.customer_id && j.scheduled_date === nextDateStr);
      if (!alreadyScheduled) {
        createNextJob({
          customer_id: job.customer_id,
          customer_name: job.customer_name,
          customer_address: job.customer_address,
          scheduled_date: nextDateStr,
          status: "scheduled",
          price: job.price,
          job_type: job.job_type,
          notes: job.notes,
          recurring_rule: job.recurring_rule,
          is_recurring: true,
        });
      }
    }
  }
}

// Auto review-request for one-time customers: when their job is completed we
// open the customer's messaging app with the review request pre-filled (the
// same sms: + interaction-log mechanism as the preset texts) using the
// Google review link from Business Settings. Recurring customers never get it.
export function maybeRequestGoogleReview(job, customer, settings) {
  if (!customer || !customer.phone || !settings?.google_review_link) return false;
  const isOneTime = job.recurring_rule === "one_time" || customer.is_recurring === false;
  if (!isOneTime) return false;
  const message =
    `Hi ${customer.name}! Thanks for letting us take care of your ${job.job_type || "yard"}. ` +
    `If you were happy with the work, a quick Google review really helps us out: ${settings.google_review_link}`;
  const digits = customer.phone.replace(/\D/g, "");
  window.location.href = `sms:${digits}?&body=${encodeURIComponent(message)}`;
  logInteraction({
    customer_id: customer.id,
    customer_name: customer.name,
    type: "preset_message",
    description: `[Review Request] ${message}`,
  });
  return true;
}