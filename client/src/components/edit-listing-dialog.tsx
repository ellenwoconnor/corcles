import { z } from "zod";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { type Item } from "@shared/schema";
import { ListingForm } from "./listing/listing-form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface EditListingDialogProps {
  item: Item;
  trigger?: React.ReactNode;
}

// Create a schema for editing that includes all fields from insertItemSchema
const editSchema = z.object({
  // ...insertItemSchema._def.schema.shape, // Access the underlying schema shape
  imageFile: z.any().optional(),
});

type FormData = z.infer<typeof editSchema>;


export function EditListingDialog({
  item,
  trigger,
}: EditListingDialogProps) {
  const [open, setOpen] = useState(false);

  const defaultValues = {
    title: item.title,
    description: item.description || "",
    price: item.price || 0,
    isGift: !!item.isGift,
    imageUrl: item.imageUrl,
    userId: item.userId,
    communityId: item.communityId,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>
            Update your listing information below.
          </DialogDescription>
        </DialogHeader>
        <ListingForm
          mode="edit"
          itemId={item.id}
          defaultValues={defaultValues}
          onSuccess={() => setOpen(false)}
          buttonText="Update Listing"
          schema={editSchema}
        />
      </DialogContent>
    </Dialog>
  );
}