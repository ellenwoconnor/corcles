import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertWishlistSchema, type InsertWishlist } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";

interface CreateWishlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWishlistDialog({
  open,
  onOpenChange,
}: CreateWishlistDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userCommunities = [] } = useQuery<
    { id: number; name: string }[]
  >({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });

  // Find default (non-custom) community
  const defaultCommunity = userCommunities?.find((c) => !c.isCustom);

  const form = useForm<InsertWishlist>({
    resolver: zodResolver(insertWishlistSchema),
    defaultValues: {
      title: "",
      description: "",
      communityId: defaultCommunity?.id,
      budget: undefined,
      urgency: "normal",
      isPrivate: false,
      userId: user?.id,
    },
  });

  const createWishlist = useMutation({
    mutationFn: async (data: InsertWishlist) => {
      const res = await apiRequest("POST", "/api/wishlists", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create wishlist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/wishlists"] });
      toast({
        title: "Wishlist created",
        description: "Your wishlist has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating wishlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertWishlist) => {
    // Make sure we have the user ID
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to create a wishlist",
        variant: "destructive",
      });
      return;
    }

    // Add the user ID to the form data
    const wishlistData = {
      ...data,
      userId: user.id,
    };

    createWishlist.mutate(wishlistData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Post Item</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Create Wishlist Item</DialogTitle>
          <DialogDescription>Add an item you're looking for</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="communityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a community" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userCommunities.map((community) => (
                        <SelectItem
                          key={community.id}
                          value={community.id.toString()}
                          defaultChecked={!community.isCustom} // Added defaultChecked prop
                        >
                          {community.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 gap-2">
                  <div className="space-y-2">
                    <FormLabel>Private Wishlist Item</FormLabel>
                    <FormDescription>
                      Notify me about matches, but don't post to the community.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createWishlist.isPending}>
                Create Wishlist
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
