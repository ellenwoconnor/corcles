import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink, Users } from "lucide-react";
import type { Wishlist } from "@shared/schema";
import { useLocation } from "wouter";
import { useState } from "react";

interface WishlistDetailsDialogProps {
  wishlist: Wishlist | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  showFulfillButton?: boolean;
  onFulfill?: () => void;
  userHasOfferedToFulfill?: (userId: number) => boolean;
  currentUserId?: number;
}

export default function WishlistDetailsDialog({
  wishlist,
  open,
  onOpenChange,
  showFulfillButton,
  onFulfill,
  userHasOfferedToFulfill,
  currentUserId,
}: WishlistDetailsDialogProps) {
  const [, setLocation] = useLocation();

  // Query for community details
  const { data: communityData } = useQuery({
    queryKey: ["community", wishlist?.communityId],
    enabled: !!wishlist?.communityId,
    queryFn: async () => {
      const response = await fetch(`/api/communities/${wishlist?.communityId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Query for user details
  const { data: userData } = useQuery({
    queryKey: ["user", wishlist?.userId],
    enabled: !!wishlist?.userId,
    queryFn: async () => {
      const response = await fetch(`/api/users/${wishlist?.userId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Query for items related to this wishlist
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ["items", wishlist?.id],
    enabled: !!wishlist,
    queryFn: async () => {
      const response = await fetch(
        `/api/items?communities=${wishlist?.communityId}&includeWithRecipients=true`,
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Filter offers based on wishlist and user role
  const relevantOffers = allItems.filter((item) => {
    if (!wishlist || !currentUserId) return false;

    // Show only if:
    // 1. User is the wishlist owner and this is an offer for their wishlist
    // 2. User is the one who made the offer
    return (
      item.wishlistId === wishlist.id &&
      (currentUserId === wishlist.userId || currentUserId === item.userId)
    );
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: wishlist?.title || "",
    description: wishlist?.description || "",
    budget: wishlist?.budget || "",
    urgency: wishlist?.urgency || "normal",
    isPrivate: wishlist?.isPrivate || false,
  });

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/wishlists/${wishlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Failed to update wishlist");

      const updated = await response.json();
      queryClient.setQueryData(["/api/communities/wishlists"], (old: any[]) =>
        old.map((w) => (w.id === updated.id ? updated : w)),
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating wishlist:", error);
    }
  };

  if (!wishlist) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {isEditing ? (
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full p-2 border rounded"
                placeholder="Title"
              />
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full p-2 border rounded"
                placeholder="Description"
              />
              <input
                type="number"
                value={editForm.budget}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, budget: e.target.value }))
                }
                className="w-full p-2 border rounded"
                placeholder="Budget"
              />
              <select
                value={editForm.urgency}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, urgency: e.target.value }))
                }
                className="w-full p-2 border rounded"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.isPrivate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isPrivate: e.target.checked,
                    }))
                  }
                />
                Private
              </label>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <DialogTitle className="text-xl font-semibold mb-3">
                {wishlist.title}
                {currentUserId === wishlist.userId && (
                  <Button
                    variant="ghost"
                    className="ml-2"
                    onClick={() => {
                      setEditForm({
                        title: wishlist.title,
                        description: wishlist.description || "",
                        budget: wishlist.budget || "",
                        urgency: wishlist.urgency || "normal",
                        isPrivate: wishlist.isPrivate,
                      });
                      setIsEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </DialogTitle>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>
                    Listed by {wishlist.userDisplayName || "Anonymous"} in{" "}
                    {wishlist.communityName || "Unknown Community"}
                  </span>
                  <span>{communityData?.mascot || "🏠"}</span>
                </div>
                <div>
                  {formatDistanceToNow(new Date(wishlist.createdAt), {
                    addSuffix: true,
                  })}
                </div>
                {wishlist.budget && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="ml-2">${wishlist.budget}</span>
                  </div>
                )}
                {wishlist.urgency && (
                  <div>
                    <span className="text-muted-foreground">Priority:</span>
                    <span className="ml-2 capitalize">{wishlist.urgency}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogHeader>
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm leading-relaxed">
              {wishlist.description || "No description provided"}
            </p>
          </div>

          {/* Offers Section */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {relevantOffers.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Offers</h3>
                  <div className="space-y-3">
                    {relevantOffers.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => {
                          onOpenChange?.(false);
                          setLocation(`/item/${item.id}`);
                        }}
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-16 h-16 rounded-md object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {currentUserId === wishlist.userId
                              ? `Offered by ${item.userDisplayName}`
                              : "Your offer"}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Action Buttons */}
          {showFulfillButton &&
            !userHasOfferedToFulfill?.(currentUserId || 0) && (
              <div className="flex justify-end pt-2">
                <Button onClick={onFulfill} className="w-full sm:w-auto">
                  Offer to Fulfill
                </Button>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
