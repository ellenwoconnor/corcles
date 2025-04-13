import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CancelButtonProps {
  itemId: number;
  requestId: number;
  variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost";
  onCanceled?: () => void;
}

export function CancelButton({ itemId, requestId, variant = "destructive", onCanceled }: CancelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", `/api/items/${itemId}/cancel-pickup`, {
        requestId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel pickup');
      }

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
        description: error instanceof Error ? error.message : "Failed to cancel pickup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setIsOpen(true)}
      >
        Cancel Pickup
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Pickup</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this transaction? This will repost the listing so other users can claim the item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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