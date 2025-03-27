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
import { useState, useEffect } from "react";
import { z } from "zod";
// Import the new component
import CommunityInviteForm from "@/components/community-invite-form";
import Picker from "emoji-picker-react";

export default function CommunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null,
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [placeholderText, setPlaceholderText] = useState({
    name: "",
    description: "",
  });

  const suggestions = [
    { name: "Sock orphans", description: "Help lost socks find each other" },
    {
      name: "The blue cowboys",
      description: "A group for people to share multicolored cowboy hats",
    },
    {
      name: "Unnecessary lamps",
      description:
        "Have a lamp shaped like a pineapple? Exchange lighting fixtures that don't add up",
    },
    {
      name: "High maintenance plant swap",
      description:
        "Exchange houseplants you regret buying along with your lessons learned",
    },
    {
      name: "Better than no furniture",
      description:
        "Imperfect furniture for when you've just moved in because it's better than sitting on the floor",
    },
    {
      name: "Fix-it hopefuls",
      description: "A project graveyard for aspirational fix-it ideas",
    },
    {
      name: "Party favor graveyard",
      description:
        "Reuse useless plastic trinkets that probably shouldn't exist",
    },
  ];

  const getRandomPlaceholder = () => {
    const randomIndex = Math.floor(Math.random() * suggestions.length);
    return suggestions[randomIndex];
  };

  useEffect(() => {
    if (createDialogOpen) {
      setPlaceholderText(getRandomPlaceholder());
    }
  }, [createDialogOpen]); // Added emoji picker state

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
      mascot: "", // Added default value for mascot
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
      <main className="container py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl tracking-tight">Communities</h1>
            <p className="text-muted-foreground">
              Manage your communities and invitations
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Community</Button>
            </DialogTrigger>
            <DialogContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Create a New Community</DialogTitle>
                    <DialogDescription>
                      Create a custom community to share items with a specific
                      group.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={placeholderText.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder={placeholderText.description}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mascot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mascot</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setShowEmojiPicker(!showEmojiPicker)
                                  }
                                  className="w-12 h-12 text-2xl hover:bg-accent"
                                >
                                  {field.value || "❓"}
                                </Button>
                                {showEmojiPicker && (
                                  <div
                                    className="fixed z-[100] mt-2 bg-background border rounded-lg shadow-lg"
                                    style={{
                                      top: "50%",
                                      left: "50%",
                                      transform: "translate(-50%, -50%)",
                                    }}
                                  >
                                    <Picker
                                      onEmojiClick={(emojiData: any) => {
                                        field.onChange(emojiData.emoji);
                                        setShowEmojiPicker(false);
                                      }}
                                      theme="light"
                                      skinTonePosition="none"
                                      previewPosition="none"
                                      height={300}
                                      width={280}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createCommunityMutation.isPending}
                    >
                      {createCommunityMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Community
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : !communities?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>No Communities</CardTitle>
              <CardDescription>
                You haven't joined any communities yet. Create one to get
                started!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Card key={community.id}>
                <CardHeader className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base truncate flex items-center gap-2">
                          <span className="text-xl">{community.mascot}</span>
                          {community.name}
                        </CardTitle>
                        <Badge
                          variant={
                            community.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {community.role}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-1">
                        {community.description}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{community.memberCount} members</span>
                        </div>
                        <div>
                          Created {format(new Date(community.createdAt), "PP")}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                  <Dialog
                    open={inviteDialogOpen}
                    onOpenChange={setInviteDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setSelectedCommunity(community);
                          setInviteDialogOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Invite to {selectedCommunity?.name}
                        </DialogTitle>
                        <DialogDescription className="mb-4">
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-3">
                            <p className="font-medium text-foreground mb-2">
                              {selectedCommunity?.isCustom
                                ? "Share the community spirit!"
                                : "Invite neighbors to your local circle!"}
                            </p>
                            <p className="text-muted-foreground">
                              {selectedCommunity?.isCustom
                                ? "Your friend will receive an email with instructions on how to join this custom community."
                                : "Neighbors with matching zip codes can join this community. They'll receive an email with setup instructions."}
                            </p>
                            {!selectedCommunity?.isCustom && (
                              <p className="mt-2 text-sm text-amber-600 flex items-center">
                                <span className="mr-1">⚠️</span> This community
                                is limited to addresses in your zip code area.
                              </p>
                            )}
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        {selectedCommunity && (
                          <CommunityInviteForm
                            community={selectedCommunity}
                            onSuccess={() => setInviteDialogOpen(false)}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
