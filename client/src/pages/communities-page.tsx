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
import Picker from 'emoji-picker-react';

export default function CommunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null,
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Added emoji picker state

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
                          <FormLabel>Community Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter community name"
                            />
                          </FormControl>
                          <FormDescription>
                            Choose a unique name for your community
                          </FormDescription>
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
                            <Input
                              {...field}
                              placeholder="Enter community description"
                            />
                          </FormControl>
                          <FormDescription>
                            Briefly describe the purpose of this community
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mascot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Community Mascot</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="relative">
  <Input 
    {...field} 
    type="text" 
    placeholder="Choose an emoji (e.g. 🏠)" 
    maxLength={2} 
    readOnly 
    onClick={() => setShowEmojiPicker(true)}
  />
  <Button 
    type="button"
    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
    className="absolute top-1/2 right-2 transform -translate-y-1/2"
  >
    Select Emoji
  </Button>
  {showEmojiPicker && (
    <div className="fixed z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg">
      <div className="flex justify-end p-2">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setShowEmojiPicker(false)}
        >
          ✕
        </Button>
      </div>
      <Picker 
        onEmojiClick={(emojiData: any) => {
          field.onChange(emojiData.emoji);
          setShowEmojiPicker(false);
        }}
        theme="light"
        skinTonePosition="none"
        previewPosition="none"
      />
    </div>
  )}
</div>
                            </div>
                          </FormControl>
                          <FormDescription>Pick an emoji to represent your community</FormDescription>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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