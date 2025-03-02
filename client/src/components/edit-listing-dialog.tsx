import { z } from "zod";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { insertItemSchema, type Item } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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
  ...insertItemSchema._def.schema.shape, // Access the underlying schema shape
  imageFile: z.any().optional(),
});

type FormData = z.infer<typeof editSchema>;

export function EditListingDialog({
  item,
  trigger,
}: EditListingDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateItemMutation = useMutation({
    mutationFn: async (data: {formData: FormData, imageFile: File | null}) => {
      const formData = new FormData();
      formData.append('title', data.formData.title.trim());
      formData.append('description', data.formData.description || '');
      formData.append('isGift', String(data.formData.isGift));
      formData.append('price', data.formData.isGift ? '0' : String(data.formData.price || 0));
      formData.append('communityId', String(item.communityId));
      formData.append('userId', String(user?.id));

      if (data.imageFile) {
        formData.append('imageFile', data.imageFile);
      }

      const response = await apiRequest("PATCH", `/api/items/${item.id}`, formData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });

      toast({
        title: "Success!",
        description: "Your listing has been updated.",
      });

      setOpen(false);
    },
    onError: (error) => {
      console.error("Update failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update listing",
      });
    },
  });

  const handleSubmit = async (values: FormData, imageFile: File | null) => {
    updateItemMutation.mutate({formData: values, imageFile});
  };

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
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isLoading={updateItemMutation.isPending}
          schema={editSchema}
          buttonText="Update Listing"
        />
      </DialogContent>
    </Dialog>
  );
}