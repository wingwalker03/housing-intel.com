import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export function ContactDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/contact", { name, email, message });
      setSent(true);
    } catch (err) {
      console.error("Contact error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        setSent(false);
        setName("");
        setEmail("");
        setMessage("");
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground" data-testid="button-contact-header">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Contact</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Us</DialogTitle>
        </DialogHeader>
        {sent ? (
          <div className="text-center py-6" data-testid="status-dialog-sent">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-bold mb-1">Message Sent!</p>
            <p className="text-sm text-muted-foreground">We'll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required data-testid="input-dialog-name" />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-dialog-email" />
            </div>
            <div>
              <Label htmlFor="contact-message">Message</Label>
              <Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} data-testid="input-dialog-message" />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-dialog-send">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Message
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
