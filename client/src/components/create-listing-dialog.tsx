import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { insertItemSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { ListingForm } from "./listing/listing-form";

interface CreateListingDialogProps {
  communities: (Community & { role: string; memberCount: number })[];
}

// Create a schema that combines the insert schema with additional fields
// Create a modified schema for the form that doesn't require imageFile
const formSchema = z.object({
  ...insertItemSchema.shape,
  communityId: z.number({
    required_error: "Please select a community",
  }),
  imageFile: z.any().optional(), // Make imageFile optional in the form
});

type FormData = z.infer<typeof formSchema>;

export default function CreateListingDialog({
  communities,
}: CreateListingDialogProps) {
  console.log("CreateListingDialog rendering", { communities });
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (data: FormData, imageFile: File | null) => {
    console.log("Form submitted with data:", data);

    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to create a listing.",
      });
      return;
    }

    if (!data.communityId) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Please select a community",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Make sure we have the required fields and proper types
      const itemData = {
        title: data.title || "",
        description: data.description || "",
        isGift: Boolean(data.isGift),
        price: data.isGift ? 0 : (data.price || 0),
        imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1737282836845-555d9214dfe4",
        userId: user.id,
        communityId: Number(data.communityId)
      };

      console.log("Submitting item data:", itemData);

      // Force title validation before submission
      if (!itemData.title || itemData.title.trim() === '') {
        form.setError("title", {
          type: "manual",
          message: "Title is required",
        });
        toast({
          variant: "destructive", 
          title: "Validation error",
          description: "Title is required",
        });
        setIsLoading(false);
        return;
      }

      // Check if we're using a FormData approach (with file) or JSON approach
      if (imageFile) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('title', itemData.title.trim());
        formData.append('description', itemData.description || '');
        formData.append('isGift', String(itemData.isGift));
        formData.append('price', itemData.isGift ? '0' : String(itemData.price || 0));
        formData.append('imageUrl', itemData.imageUrl);
        formData.append('userId', String(user.id));
        formData.append('communityId', String(itemData.communityId));
        formData.append('imageFile', imageFile);

        const response = await apiRequest("POST", "/api/items", formData, {
          // Don't set Content-Type header, let browser set it with boundary
        });

        if (!response.ok) {
          const errorData = await response.json();
          let errorMessage = "Failed to create listing";

          // Extract error message from Zod validation errors if available
          if (errorData.issues && errorData.issues.length > 0) {
            errorMessage = errorData.issues.map(issue => issue.message).join(", ");
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }

          throw new Error(errorMessage);
        }
      } else {
        // Use JSON when no file is being uploaded
        const response = await apiRequest("POST", "/api/items", itemData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          let errorMessage = "Failed to create listing";

          // Extract error message from Zod validation errors if available
          if (errorData.issues && errorData.issues.length > 0) {
            errorMessage = errorData.issues.map(issue => issue.message).join(", ");
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }

          throw new Error(errorMessage);
        }
      }

      setOpen(false);
      toast({
        title: "Listing created!",
        description: "Your item has been successfully listed.",
      });
      // Invalidate queries to refresh the item list
      queryClient.invalidateQueries(["/api/items"]);
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast({
        variant: "destructive",
        title: "Failed to create listing",
        description: error instanceof Error ? error.message : "There was an error creating your listing. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          onSubmit={handleSubmit}
          isLoading={isLoading}
          schema={formSchema}
          buttonText="Create Listing"
        />
      </DialogContent>
    </Dialog>
  );
}