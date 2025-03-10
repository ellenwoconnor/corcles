
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface EditListingDialogProps {
  item: Item;
}

export function EditListingDialog({ item }: EditListingDialogProps) {
  const [open, setOpen] = useState(false);

  // Disable editing for delisted items
  if (item.status === "delisted") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground cursor-not-allowed opacity-70"
              disabled={true}
            >
              <Pencil size={16} />
              <span className="sr-only">Edit</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delisted items cannot be edited</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Pencil size={16} />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>
            Update the details of your listing.
          </DialogDescription>
        </DialogHeader>
        <ListingForm 
          mode="edit"
          itemId={item.id}
          defaultValues={item}
          onSuccess={() => setOpen(false)}
          buttonText="Update Listing"
        />
      </DialogContent>
    </Dialog>
  );
}
