import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  insertCommunitySchema,
  type Community,
  type InsertCommunity,
} from "@shared/schema";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, UserPlus, Users } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { z } from "zod";
// Import the new component
import CommunityInviteForm from "@/components/community-invite-form";
import { PageHeader } from "@/components/page-header";
import CommunitySelector from "@/components/community-selector";
import ItemGrid from "@/components/item-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import CreateListingPanel from "@/components/create-listing-panel";
import { useStore } from "@/lib/state-store";
import WishlistGrid from "@/components/wishlist-grid";


export default function CommunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("available");

  const selectedCommunityIds = useStore((state) => state.selectedCommunityIds);

  const { data: communities, isLoading } = useQuery<
    (Community & { role: string; memberCount: number })[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const form = useForm<InsertCommunity>({
    resolver: zodResolver(insertCommunitySchema),
    defaultValues: {
      name: "",
      description: "",
      createdBy: user?.id,
      isCustom: true,
    },
  });

  const createCommunityMutation = useMutation({
    mutationFn: async (data: InsertCommunity) => {
      const response = await apiRequest("POST", "/api/communities", {
        ...data,
        createdBy: user?.id,
        isCustom: true,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create community");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      toast({
        title: "Community created",
        description: "Your new community has been created successfully.",
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create community",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCommunity) => {
    createCommunityMutation.mutate(data);
  };

  // Query items
  const communityParam = selectedCommunityIds.join(",");
  const { data: items, refetch: refetchItems } = useQuery({
    queryKey: [`/api/items?communities=${communityParam}`, searchTerm, freeOnly],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (selectedCommunityIds.length > 0) {
        searchParams.append("communities", selectedCommunityIds.join(","));
      }
      if (searchTerm) {
        searchParams.append("search", searchTerm);
      }
      if (freeOnly) {
        searchParams.append("freeOnly", "true");
      }

      const response = await fetch(`/api/items?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      return response.json();
    },
    enabled: selectedCommunityIds.length > 0,
  });

  // Query user's items
  const { data: userItems } = useQuery({
    queryKey: ["/api/user/items"],
    queryFn: async () => {
      const response = await fetch("/api/user/items");
      if (!response.ok) {
        throw new Error("Failed to fetch user items");
      }
      return response.json();
    },
    enabled: !!user && activeTab === "my-listings",
  });

  // Query user's requests
  const { data: userRequests } = useQuery({
    queryKey: ["/api/user/requests"],
    queryFn: async () => {
      const response = await fetch("/api/user/requests");
      if (!response.ok) {
        throw new Error("Failed to fetch user requests");
      }
      return response.json();
    },
    enabled: !!user && activeTab === "my-requests",
  });

  // Query community wishlists
  const { data: wishlists } = useQuery({
    queryKey: ["/api/communities/wishlists"],
    queryFn: async () => {
      const response = await fetch("/api/communities/wishlists");
      if (!response.ok) {
        throw new Error("Failed to fetch wishlists");
      }
      return response.json();
    },
    enabled: !!user && activeTab === "wishlists",
  });

  // Memoize the filtered items for the "My Requests" tab
  const myRequestedItems = useMemo(() => {
    if (!userRequests) return [];
    return userRequests.map((request: any) => ({
      ...request.item,
      requestStatus: request.status,
      requestId: request.id,
    }));
  }, [userRequests]);

  // Helper to find community name by ID
  const getCommunityName = (id: number) => {
    if (!communities) return "Loading...";
    const community = communities.find((c: Community) => c.id === id);
    return community ? community.name : "Unknown Community";
  };

  useEffect(() => {
    if (searchTerm || freeOnly) {
      refetchItems();
    }
  }, [searchTerm, freeOnly, refetchItems]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Please Sign In</h2>
            <p className="text-muted-foreground">
              You need to be signed in to view your communities.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8">
        <PageHeader
          heading="Marketplace"
          text="Browse, buy, gift, and request items in your communities."
        />

        <CommunitySelector />

        <Tabs
          defaultValue="available"
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <TabsList>
              <TabsTrigger value="available">Available Items</TabsTrigger>
              <TabsTrigger value="my-listings">My Listings</TabsTrigger>
              <TabsTrigger value="my-requests">My Requests</TabsTrigger>
              <TabsTrigger value="wishlists">Wishlists</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-60"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="free-only"
                  checked={freeOnly}
                  onCheckedChange={(checked) => setFreeOnly(!!checked)}
                />
                <Label htmlFor="free-only">Free Only</Label>
              </div>
            </div>
          </div>

          <TabsContent value="available" className="mt-2">
            <ItemGrid
              items={items || []}
              getCommunityName={getCommunityName}
              emptyMessage={
                selectedCommunityIds.length === 0
                  ? "Please select at least one community to see items."
                  : "No items found. Try changing your search or selecting different communities."
              }
            />
          </TabsContent>

          <TabsContent value="my-listings" className="mt-2">
            <div className="flex justify-end mb-4">
              <CreateListingPanel />
            </div>
            <ItemGrid
              items={userItems || []}
              getCommunityName={getCommunityName}
              emptyMessage="You haven't listed any items yet."
              hideFavoriteButton
            />
          </TabsContent>

          <TabsContent value="my-requests" className="mt-2">
            <ItemGrid
              items={myRequestedItems}
              getCommunityName={getCommunityName}
              emptyMessage="You haven't requested any items yet."
              showRequestStatus
            />
          </TabsContent>

          <TabsContent value="wishlists" className="mt-2">
            <WishlistGrid
              wishlists={wishlists || []}
              emptyMessage="No wishlist items found in your communities."
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}