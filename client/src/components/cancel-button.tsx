import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CancelButtonProps {
  itemId: number;
  onCanceled: () => void;
}

export function CancelButton({ itemId, onCanceled }: CancelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/items/${itemId}/cancel-pickup`, {
        reason: reason.trim() || undefined
      });

      toast({
        title: "Pickup Canceled",
        description: "The pickup has been canceled successfully."
      });

      setIsOpen(false);
      if (onCanceled) {
        onCanceled();
      }
    } catch (error) {
      console.error('Error canceling pickup:', error);
      toast({
        title: "Error",
        description: "Failed to cancel pickup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsOpen(true)}
      >
        Cancel Pickup
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Pickup</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this pickup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Optional: Provide a reason for cancellation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="max-h-36"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Keep Pickup
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Yes, Cancel Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}