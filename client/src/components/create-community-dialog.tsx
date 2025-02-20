import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage,FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { insertCommunitySchema } from "@shared/schema";
import type { InsertCommunity } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CreateCommunityDialog() {
  const [open, setOpen] = useState(false);
  const [isHomeType, setIsHomeType] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertCommunity>({
    resolver: zodResolver(
      isHomeType 
        ? insertCommunitySchema 
        : insertCommunitySchema.omit({ zipCode: true })
    ),
    defaultValues: {
      name: "",
      description: "",
      zipCode: "",
    },
  });

  async function onSubmit(data: InsertCommunity) {
    try {
      const submitData = isHomeType ? data : { ...data, zipCode: null };
      await apiRequest("/api/communities", {
        method: "POST",
        body: JSON.stringify({
          ...submitData,
          isHomeType
        }),
      });

      toast({
        title: "Community created",
        description: "Your new community has been created successfully.",
      });

      // Invalidate communities cache
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create community. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Community
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Community</DialogTitle>
          <DialogDescription>
            Create a new community to connect with neighbors and share items.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Community Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter community name" {...field} />
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
                    <Textarea
                      placeholder="Describe your community..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Home Community</FormLabel>
                <FormDescription>
                  Switch between home (ZIP code-based) and custom (invite-only) community
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={isHomeType}
                  onCheckedChange={setIsHomeType}
                />
              </FormControl>
            </FormItem>

            {isHomeType && (
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ZIP code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Community</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}