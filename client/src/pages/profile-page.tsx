import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift, Tag, Clock, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showZipWarning, setShowZipWarning] = useState(false);
  const [formData, setFormData] = useState<{
    displayName: string;
    address: string;
    zipCode: string;
  }>({
    displayName: user?.displayName || "",
    address: user?.address || "",
    zipCode: user?.zipCode || ""
  });

  const { data: userItems, isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  const { data: inviteData } = useQuery<{ count: number }>({
    queryKey: ["/api/user/invites/count"],
    enabled: !!user,
  });
  
  // Default to 0 for invite count if not available
  const inviteCount = inviteData?.count || 0;
  
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PATCH", "/api/user", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
        variant: "default",
      });
      setIsEditing(false);
      // Wait for the query to be refetched before redirecting
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Please Sign In</h2>
            <p className="text-muted-foreground">
              You need to be signed in to view your profile.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12">
        <h1 className="text-2xl tracking-tight mb-8">{user.username}</h1>
        <div className="mb-8">
          <Card>
            <CardContent>
              <div className="space-y-6">
                <div className="mt-8 pt-6">
                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        console.log("Form submitted", {
                          formZipCode: formData.zipCode,
                          userZipCode: user?.zipCode,
                          isZipChanged: formData.zipCode !== user?.zipCode
                        });
                        // Check if zip code was changed
                        if (formData.zipCode !== user?.zipCode) {
                          console.log("Showing zip warning dialog");
                          setShowZipWarning(true);
                        } else {
                          console.log("No zip change, updating profile directly");
                          // If no zip change, just update profile
                          updateMutation.mutate(formData);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          Display Name
                        </label>
                        <input
                          name="displayName"
                          value={formData.displayName}
                          onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                          className="w-full p-2 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          Address
                        </label>
                        <input
                          name="address"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="w-full p-2 border rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium block mb-2">
                          Zip Code
                        </label>
                        <input
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                          className="w-full p-2 border rounded-md"
                          required
                          pattern="\d{5}"
                          title="Zip code must be exactly 5 digits"
                          maxLength={5}
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          type="submit" 
                          variant="default"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            // Reset form data to original values
                            setFormData({
                              displayName: user?.displayName || "",
                              address: user?.address || "",
                              zipCode: user?.zipCode || ""
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Display Name
                        </p>
                        <p>{user.displayName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Address
                        </p>
                        <p>{user.address}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Zip Code
                        </p>
                        <p>{user.zipCode}</p>
                      </div>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="mt-2"
                      >
                        Edit Profile
                      </Button>
                    </div>
                  )}
                  
                  {/* Zip code change warning alert dialog */}
                  <AlertDialog 
                    open={showZipWarning} 
                    onOpenChange={(open) => {
                      console.log("Dialog open state changed:", { open });
                      if (!open) {
                        console.log("Dialog closing via onOpenChange");
                        // User clicked outside or pressed escape
                        // Reset the zip code to original
                        setFormData({
                          ...formData,
                          zipCode: user?.zipCode || ""
                        });
                      }
                      setShowZipWarning(open);
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Community Reassignment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Changing your zip code will remove you from your current community and reassign you to a new community based on your new zip code. This means you won't see listings from your old community anymore.
                          <br /><br />
                          Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                          console.log("Cancel button clicked");
                          // Reset zip code back to original
                          setFormData({
                            ...formData,
                            zipCode: user?.zipCode || ""
                          });
                          setShowZipWarning(false);
                        }}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                          console.log("Confirm button clicked, updating profile with new zip");
                          updateMutation.mutate(formData);
                          setShowZipWarning(false);
                        }}>
                          Yes, Change My Community
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 grid-cols-2">
          <Card className="text-center bg-muted bg-opacity-30">
            <div className="pt-6 flex justify-center">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Active Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {userItems?.filter((i) => i.status === "available")?.length ||
                  0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-muted bg-opacity-30">
            <div className="pt-6 flex justify-center">
              <Gift className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Items Given</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">
                {userItems?.filter((i) => i.status === "completed")?.length ||
                  0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-muted bg-opacity-30">
            <div className="pt-6 flex justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Users Invited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{inviteCount}</div>
            </CardContent>
          </Card>

          <Card className="text-center bg-muted bg-opacity-30">
            <div className="pt-6 flex justify-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Member Since
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{formatDate(user.createdAt)}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
