import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart } from "lucide-react";

const QUICK_MESSAGES = [
  "Hey! Just wanted to say you've been crushing it lately. Your work ethic doesn't go unnoticed. Keep it up!",
  "Great job out there today! The yards look amazing and customers are happy. Proud to have you on the team.",
  "You showed up, handled business, and did excellent work. That's exactly what we need. Thank you!",
];

export default function KudosDialog({ employee, onClose, onSend }) {
  const [title, setTitle] = useState("Great Work!");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend({ title: title.trim(), message: message.trim() });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" /> Send Kudos to {employee?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Great Work!" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Kind Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a kind note..." rows={4} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MESSAGES.map((q, i) => (
              <button key={i} type="button" onClick={() => setMessage(q)} className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
                Quick {i + 1}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">This will show as a celebration animation next time {employee?.name?.split(" ")[0]} opens their portal.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-primary text-black hover:bg-primary/90">Send Kudos 🎉</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}