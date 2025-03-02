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
  communities: Array<{
    id: number;
    name: string;
    role: string;
    memberCount: number;
  }>;
}

// Create a schema for the form by combining insertItemSchema fields with additional ones
const formSchema = z.object({
  ...insertItemSchema._def.schema.shape, // Access the underlying schema shape
  communityId: z.number({
    required_error: "Please select a community",
  }),
  imageFile: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateListingDialog({
  communities,
}: CreateListingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (data: FormData, imageFile: File | null) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to create a listing.",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Create FormData for the request
      const formData = new FormData();

      // Validate required fields before submission
      if (!data.title) {
        throw new Error("Title is required");
      }

      if (!data.communityId) {
        throw new Error("Community selection is required");
      }

      // Debug the form data
      console.log("Form data received:", data);

      // Log complete form data before creating FormData
      console.log("Complete form data before sending:", {
        title: data.title,
        description: data.description,
        isGift: data.isGift,
        price: data.price,
        userId: user.id,
        communityId: data.communityId,
        imageUrl: data.imageUrl,
        hasImageFile: !!imageFile
      });
      
      formData.append("title", data.title.trim());
      formData.append("description", data.description || "");
      formData.append("isGift", String(data.isGift));
      formData.append("price", data.isGift ? "0" : String(data.price || 0));
      formData.append("userId", String(user.id));
      // Ensure communityId is a valid number before converting to string
      if (data.communityId === undefined || isNaN(data.communityId)) {
        throw new Error("Community selection is required");
      }
      
      formData.append("communityId", String(data.communityId));
      console.log("Adding communityId to FormData:", data.communityId, typeof data.communityId);
      formData.append(
        "imageUrl",
        data.imageUrl ||
          "https://images.unsplash.com/photo-1737282836845-555d9214dfe4",
      );

      // Only append imageFile if one was provided
      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      // Log FormData entries for debugging
      console.log("FormData entries:");
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }
      
      console.log("Submitting form data:", {
        title: data.title,
        isGift: data.isGift,
        communityId: data.communityId,
      });

      const response = await apiRequest("POST", "/api/items", formData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create listing");
      }

      setOpen(false);
      toast({
        title: "Success!",
        description: "Your listing has been created.",
      });

      // Invalidate queries to refresh the listings
      await queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create listing",
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
