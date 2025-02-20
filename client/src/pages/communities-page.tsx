import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertCommunitySchema, type Community, type InsertCommunity } from "@shared/schema";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

export default function CommunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  const { data: communities, isLoading } = useQuery<(Community & { role: string; memberCount: number })[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  const form = useForm<InsertCommunity>({
    resolver: zodResolver(insertCommunitySchema),
    defaultValues: {
      name: "",
      description: "",
      createdBy: user?.id,
      isCustom: true
    },
  });

  const inviteForm = useForm({
    resolver: zodResolver(z.object({
      email: z.string().email("Please enter a valid email address"),
    })),
    defaultValues: {
      email: "",
    },
  });

  const createCommunityMutation = useMutation({
    mutationFn: async (data: InsertCommunity) => {
      const response = await apiRequest("POST", "/api/communities", {
        ...data,
        createdBy: user?.id,
        isCustom: true
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create community');
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

  const inviteMutation = useMutation({
    mutationFn: async ({ email, communityId }: { email: string; communityId: number }) => {
      const response = await apiRequest("POST", `/api/communities/${communityId}/invite`, { invitedEmail: email });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The user has been invited to join the community.",
      });
      setInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCommunity) => {
    createCommunityMutation.mutate(data);
  };

  const onInvite = (data: { email: string }) => {
    if (!selectedCommunity) return;
    inviteMutation.mutate({ email: data.email, communityId: selectedCommunity.id });
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
            <h1 className="text-4xl font-bold tracking-tight">Communities</h1>
            <p className="text-muted-foreground">
              Manage your communities and invitations
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Create a New Community</DialogTitle>
                    <DialogDescription>
                      Create a custom community to share items with a specific group.
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
                            <Input {...field} placeholder="Enter community name" />
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
                            <Input {...field} placeholder="Enter community description" />
                          </FormControl>
                          <FormDescription>
                            Briefly describe the purpose of this community
                          </FormDescription>
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
                You haven't joined any communities yet. Create one to get started!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Card key={community.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{community.name}</CardTitle>
                      <CardDescription>{community.description}</CardDescription>
                    </div>
                    <Badge variant={community.role === 'admin' ? 'default' : 'secondary'}>
                      {community.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    <span>Created {format(new Date(community.createdAt), 'PP')}</span>
                  </div>
                </CardContent>
                {community.role === 'admin' && (
                  <CardFooter>
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => setSelectedCommunity(community)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Members
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <Form {...inviteForm}>
                          <form onSubmit={inviteForm.handleSubmit(onInvite)}>
                            <DialogHeader>
                              <DialogTitle>Invite to {community.name}</DialogTitle>
                              <DialogDescription>
                                Send an invitation to join this community.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <FormField
                                control={inviteForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="email" placeholder="Enter email address" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                type="submit"
                                disabled={inviteMutation.isPending}
                              >
                                {inviteMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Send Invitation
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}