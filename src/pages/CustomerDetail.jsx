import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { LoadingState, EmptyState, Badge } from "@/components/ui/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import CustomerForm from "@/components/CustomerForm";
import JobForm from "@/components/JobForm";
import InvoiceForm from "@/components/InvoiceForm";
import CustomerInteractionHistory from "@/components/CustomerInteractionHistory";
import CollapsibleSection from "@/components/CollapsibleSection";
import AddressLink from "@/components/AddressLink";
import { logInteraction } from "@/lib/interactionLog";
import { removeUpcomingJobs } from "@/lib/inactiveCustomer";
import { STATUS_CONFIG, PAYMENT_CONFIG, formatCurrency, formatDate, RECURRING_CONFIG, isOverdue, MULCH_CONFIG } from "@/lib/lawnCare";
import {
  Users, Phone, MapPin, ArrowLeft, Edit, Plus, ClipboardList, FileText, StickyNote, Gauge, ImageIcon, MessageSquare, Leaf
} from "lucide-react";

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: allCustomers = [], isLoading, updateItem: updateCustomer } = useEntityCollection("Customer");
  const { data: allJobs = [], createItem: createJob, deleteItem: deleteJob } = useEntityCollection("Job", { sort: "-created_date" });
  const { data: allInvoices = [], createItem: createInvoice, deleteItem: deleteInvoice } = useEntityCollection("Invoice");
  const { data: allPhotos = [] } = useEntityCollection("YardPhoto");
  const [editOpen, setEditOpen] = useState(false);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);

  const customer = allCustomers.find((c) => c.id === id);
  const jobs = allJobs.filter((j) => j.customer_id === id).sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
  const invoices = allInvoices.filter((i) => i.customer_id === id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const photos = allPhotos.filter((p) => p.customer_id === id);

  if (isLoading) return <LoadingState />;
  if (!customer) return <EmptyState icon={Users} title="Customer not found" />;

  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
  const totalOutstanding = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + (i.amount || 0), 0);

  const handleCustomerSave = (data) => {
    if (data.active === false && customer.active) removeUpcomingJobs(customer.id, allJobs, deleteJob);
    updateCustomer({ id: customer.id, ...data });
    setEditOpen(false);
  };

  const handleJobSave = (data) => {
    createJob(data);
    logInteraction({
      customer_id: customer.id,
      customer_name: customer.name,
      type: "schedule_change",
      description: `Job scheduled: ${data.job_type || "Job"} on ${data.scheduled_date} for ${formatCurrency(data.price || 0)}`,
    });
    setJobFormOpen(false);
  };

  const handleInvoiceSave = (data) => {
    createInvoice(data);
    logInteraction({
      customer_id: customer.id,
      customer_name: customer.name,
      type: "invoice",
      description: `Invoice created: ${formatCurrency(data.amount || 0)}${data.description ? ` — ${data.description}` : ""}`,
    });
    setInvoiceFormOpen(false);
  };

  // Job Analytics computations
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const timedJobs = completedJobs.filter((j) => j.timer_duration_seconds > 0);
  const totalSeconds = timedJobs.reduce((s, j) => s + j.timer_duration_seconds, 0);
  const avgSeconds = timedJobs.length > 0 ? totalSeconds / timedJobs.length : 0;
  const totalRevenue = timedJobs.reduce((s, j) => s + (j.price || 0), 0);
  const avgHourly = totalSeconds > 0 ? totalRevenue / (totalSeconds / 3600) : 0;

  const sortedJobs = completedJobs.map((job) => {
    const hasTimer = job.timer_duration_seconds > 0;
    const hourly = hasTimer ? (job.price || 0) / (job.timer_duration_seconds / 3600) : 0;
    const ratio = avgHourly > 0 && hasTimer ? hourly / avgHourly : 1;
    return { job, hasTimer, hourly, ratio };
  }).sort((a, b) => b.ratio - a.ratio);

  return (
    <div>
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      <div className="rounded-2xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-xl">{customer.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {customer.is_recurring && <Badge color="text-primary" bg="bg-primary/10">{RECURRING_CONFIG[customer.recurring_rule]?.label}</Badge>}
                <Badge color={customer.active ? "text-emerald-400" : "text-muted-foreground"} bg={customer.active ? "bg-emerald-500/10" : "bg-muted"}>
                  {customer.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Edit className="w-4 h-4 mr-2" /> Edit</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" />
              <a href={`tel:${customer.phone.replace(/\D/g, "")}`} className="hover:text-primary transition-colors underline-offset-2 hover:underline">{customer.phone}</a>
              <a href={`sms:${customer.phone.replace(/\D/g, "")}`} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">Text</a>
            </div>
          )}
          {customer.address && <div className="text-sm"><AddressLink address={customer.address} iconClassName="w-4 h-4 text-primary shrink-0" className="hover:text-primary transition-colors underline-offset-2 hover:underline" /></div>}
          {customer.mulch_type && <div className="flex items-center gap-2 text-sm"><Leaf className="w-4 h-4 text-primary" /> {MULCH_CONFIG[customer.mulch_type]?.icon} {MULCH_CONFIG[customer.mulch_type]?.label}</div>}
        </div>
        {customer.notes && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</p>
            <p className="text-sm">{customer.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Paid</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Set Price</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(customer.set_price)}</p>
        </div>
      </div>

      {/* Photos */}
      <CollapsibleSection title="Photos" icon={ImageIcon} badge={photos.length} className="mb-4">
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No photos linked to this customer</p>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                <Image src={photo.image_url} alt={photo.title} fittingType="fill" className="w-full h-full" />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Interaction History */}
      <CollapsibleSection title="Interaction History" icon={MessageSquare} className="mb-4">
        <CustomerInteractionHistory customerId={id} />
      </CollapsibleSection>

      {/* Job Analytics */}
      <CollapsibleSection title="Job Analytics" icon={Gauge} className="mb-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Avg Time</p>
            <p className="text-lg font-bold text-primary">{timedJobs.length > 0 ? `${Math.floor(avgSeconds / 60)}m` : "—"}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Avg $/Hour</p>
            <p className="text-lg font-bold text-emerald-400">{timedJobs.length > 0 ? formatCurrency(avgHourly) : "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Timed Jobs</p>
            <p className="text-lg font-bold">{timedJobs.length}</p>
          </div>
        </div>
        {completedJobs.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Job Value vs Average <span className="text-emerald-400 normal-case">↓ Worth Most First</span></p>
            {sortedJobs.map(({ job, hasTimer, hourly, ratio }) => {
              const color = ratio >= 1 ? "text-emerald-400" : ratio >= 0.75 ? "text-amber-400" : "text-red-400";
              const bg = ratio >= 1 ? "bg-emerald-500/10" : ratio >= 0.75 ? "bg-amber-500/10" : "bg-red-500/10";
              return (
                <div key={job.id} className={`flex items-center justify-between p-2 rounded-lg ${bg}`}>
                  <div>
                    <p className="text-xs font-medium">{job.job_type}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(job.scheduled_date)}{hasTimer ? ` · ⏱ ${Math.floor(job.timer_duration_seconds / 60)}m` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${color}`}>{hasTimer ? `${formatCurrency(hourly)}/hr` : "No timer"}</p>
                    <p className={`text-[10px] font-bold ${color}`}>{Math.round(ratio * 100)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CollapsibleSection
          title="Job History"
          icon={ClipboardList}
          badge={jobs.length}
          action={<Button size="sm" variant="ghost" onClick={() => setJobFormOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Job</Button>}
        >
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No jobs yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {jobs.map((job) => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
                return (
                  <div key={job.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{job.job_type}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(job.scheduled_date)}{job.timer_duration_seconds > 0 ? ` · ⏱ ${Math.floor(job.timer_duration_seconds / 60)}m` : ""}</p>
                    </div>
                    <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
                    <span className="text-sm font-medium">{formatCurrency(job.price)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Invoice History"
          icon={FileText}
          badge={invoices.length}
          action={<Button size="sm" variant="ghost" onClick={() => setInvoiceFormOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Invoice</Button>}
        >
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              {invoices.map((inv) => {
                const cfg = PAYMENT_CONFIG[inv.payment_method] || PAYMENT_CONFIG.none;
                const overdue = isOverdue(inv);
                return (
                  <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <span className="text-lg">{inv.status === "paid" ? cfg.icon : "⏳"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatCurrency(inv.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.status === "paid" ? `Paid ${formatDate(inv.paid_date)}` : `Due ${formatDate(inv.due_date)}`}
                        {overdue && <span className="text-red-400 ml-1">· OVERDUE</span>}
                      </p>
                    </div>
                    <Badge color={inv.status === "paid" ? "text-emerald-400" : "text-amber-400"} bg={inv.status === "paid" ? "bg-emerald-500/10" : "bg-amber-500/10"}>
                      {inv.status === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>
      </div>

      {editOpen && (
        <Dialog open onOpenChange={(o) => !o && setEditOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Customer</DialogTitle></DialogHeader>
            <CustomerForm customer={customer} onSubmit={handleCustomerSave} onCancel={() => setEditOpen(false)} />
          </DialogContent>
        </Dialog>
      )}
      {jobFormOpen && (
        <Dialog open onOpenChange={(o) => !o && setJobFormOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Job for {customer.name}</DialogTitle></DialogHeader>
            <JobForm
              job={{ customer_id: customer.id, customer_name: customer.name, customer_address: customer.address, price: customer.set_price }}
              customers={allCustomers}
              onSubmit={handleJobSave}
              onCancel={() => setJobFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      {invoiceFormOpen && (
        <Dialog open onOpenChange={(o) => !o && setInvoiceFormOpen(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Invoice for {customer.name}</DialogTitle></DialogHeader>
            <InvoiceForm
              invoice={{ customer_id: customer.id, customer_name: customer.name, amount: customer.set_price }}
              customers={allCustomers}
              jobs={jobs}
              onSubmit={handleInvoiceSave}
              onCancel={() => setInvoiceFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}