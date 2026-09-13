import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import JobForm from "@/components/JobForm";
import { Trash2 } from "lucide-react";

export default function CalendarEditDialog({ job, customers, employees, onSave, onDelete, onClose }) {
  if (!job) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job.id ? `Edit Job — ${job.customer_name || "Job"}` : "Add Job"}</DialogTitle>
        </DialogHeader>
        <JobForm
          job={job}
          customers={customers}
          employees={employees}
          onSubmit={onSave}
          onCancel={onClose}
        />
        {job.id && (
          <div className="pt-3 border-t border-border">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => { if (confirm(`Delete job for ${job.customer_name}?`)) onDelete(job); }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Job
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}