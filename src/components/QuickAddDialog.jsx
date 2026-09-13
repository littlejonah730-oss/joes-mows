import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerForm from "@/components/CustomerForm";
import JobForm from "@/components/JobForm";
import InvoiceForm from "@/components/InvoiceForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function QuickAddDialog({ type, onClose }) {
  const [noteContent, setNoteContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: customers = [], createItem: createCustomer } = useEntityCollection("Customer");
  const { data: jobs = [], createItem: createJob } = useEntityCollection("Job", { sort: "-scheduled_date" });
  const { data: employees = [] } = useEntityCollection("Employee");
  const { createItem: createInvoice } = useEntityCollection("Invoice");

  const titles = { customer: "Add Customer", job: "Add Job", invoice: "Create Invoice", note: "Add Note" };

  async function handleNoteSubmit() {
    if (!noteContent.trim()) return;
    setLoading(true);
    try {
      await base44.entities.Note.create({ content: noteContent, title: noteTitle, category: "general" });
      onClose();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{titles[type]}</DialogTitle></DialogHeader>
        {type === "customer" && <CustomerForm onSubmit={(data) => { createCustomer(data); onClose(); }} onCancel={onClose} />}
        {type === "job" && <JobForm customers={customers} employees={employees} onSubmit={(data) => { createJob(data); onClose(); }} onCancel={onClose} />}
        {type === "invoice" && <InvoiceForm customers={customers} jobs={jobs} onSubmit={(data) => { createInvoice(data); onClose(); }} onCancel={onClose} />}
        {type === "note" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="note_title">Title</Label>
              <Input id="note_title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Reminder title" />
            </div>
            <div>
              <Label htmlFor="note_content">Note</Label>
              <Input id="note_content" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your note..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleNoteSubmit} disabled={loading} className="bg-primary text-black hover:bg-primary/90">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Note
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}