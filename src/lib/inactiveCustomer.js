// When a customer is marked inactive, pull their upcoming jobs off the schedule.
// (The recurring generator also skips inactive customers, so the schedule stays clear
// until they're reactivated — at which point the next morning run refills the window.)
export async function removeUpcomingJobs(customerId, jobs, deleteJob) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = jobs.filter(
    (j) =>
      j.customer_id === customerId &&
      j.status === "scheduled" &&
      String(j.scheduled_date || "").slice(0, 10) >= today
  );
  await Promise.all(upcoming.map((j) => deleteJob(j.id)));
  return upcoming.length;
}