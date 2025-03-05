import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ListingForm } from "./listing/listing-form";
import { useAuth } from "@/features/auth/hooks/use-auth";

interface CreateListingDialogProps {
  communities: Array<{
    id: number;
    name: string;
    role: string;
    memberCount: number;
  }>;
}

export default function CreateListingDialog({
  communities,
}: CreateListingDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Listing</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <DialogDescription>
            Add details about the item you want to share or sell
          </DialogDescription>
        </DialogHeader>
        <ListingForm
          mode="create"
          communities={communities}
          onSuccess={() => setOpen(false)}
          buttonText="Create Listing"
        />
      </DialogContent>
    </Dialog>
  );
}