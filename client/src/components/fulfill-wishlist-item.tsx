
import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Wishlist } from "@shared/schema";
import PickupScheduler from "./pickup-scheduler";

interface FulfillWishlistItemProps {
  wishlist: Wishlist;
  communityId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function FulfillWishlistItem({
  wishlist,
  communityId,
  isOpen,
  onClose,
}: FulfillWishlistItemProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGift, setIsGift] = useState(true);
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<number | null>(null);
  const [schedulingComplete, setSchedulingComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create form data for the item
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description || "");
      formData.append("isGift", String(isGift));
      formData.append("communityId", String(communityId));
      
      if (!isGift && price) {
        formData.append("price", price);
      }
      
      if (imageUrl) {
        formData.append("imageUrl", imageUrl);
      }

      // Create the item
      const response = await apiRequest("POST", "/api/items", formData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create item");
      }
      
      const item = await response.json();
      setCreatedItemId(item.id);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      
      toast({
        title: "Item created successfully!",
        description: "Now let's schedule a pickup time.",
      });
      
    } catch (error) {
      console.error("Error creating item:", error);
      toast({
        title: "Failed to create item",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleSchedulingComplete = async () => {
    setSchedulingComplete(true);
    
    try {
      // Set the recipient to the wishlist creator
      const response = await apiRequest("PATCH", `/api/items/${createdItemId}`, {
        recipientId: wishlist.userId
      });
      
      if (!response.ok) {
        throw new Error("Failed to set recipient");
      }
      
      toast({
        title: "Wishlist item fulfilled!",
        description: "The recipient has been notified.",
      });
      
      // Navigate to the item page
      navigate({ to: `/item/${createdItemId}` });
      onClose();
    } catch (error) {
      console.error("Error completing fulfillment:", error);
      toast({
        title: "Error completing fulfillment",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fulfill Wishlist Item: {wishlist.title}</DialogTitle>
        </DialogHeader>
        
        {!createdItemId ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Item Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Enter item title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isGift"
                checked={isGift}
                onCheckedChange={(checked) => setIsGift(checked === true)}
              />
              <Label htmlFor="isGift">This is a free item (recommended)</Label>
            </div>
            
            {!isGift && (
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required={!isGift}
                  placeholder="Enter price"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Item"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p>Now, let's schedule a pickup time for this item.</p>
            
            <PickupScheduler
              itemId={createdItemId}
              itemStatus="available"
              onScheduled={handleSchedulingComplete}
            />
            
            {schedulingComplete && (
              <div className="flex justify-end">
                <Button onClick={onClose}>Done</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
