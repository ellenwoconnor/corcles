
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { insertItemSchema, type Item } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";

interface EditListingDialogProps {
  item: Item;
  trigger?: React.ReactNode;
}

export function EditListingDialog({
  item,
  trigger,
}: EditListingDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertItemSchema>>({
    resolver: zodResolver(insertItemSchema.omit({ imageFile: true })),
    defaultValues: {
      title: item.title,
      description: item.description || "",
      price: item.price || 0,
      isGift: !!item.isGift,
      imageUrl: item.imageUrl,
      userId: item.userId,
      communityId: item.communityId,
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertItemSchema>) => {
      console.log("Submitting data to API:", data);
      const response = await apiRequest("PATCH", `/api/items/${item.id}`, {
        ...data,
        price: data.isGift ? null : data.price,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }
      return response.json();
    },
    onSuccess: () => {
      console.log("Update successful, invalidating queries");
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });
      
      toast({
        title: "Listing updated",
        description: "Your listing has been successfully updated.",
      });
      
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Update failed:", error);
      toast({
        title: "Error updating listing",
        description: error.message || "There was a problem updating your listing.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof insertItemSchema>) => {
    console.log("Form submitted with values:", values);
    updateItemMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>
            Update your listing information below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(handleSubmit)} 
            className="space-y-4"
          >
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
              name="isGift"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Free Item</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {!form.watch("isGift") && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={updateItemMutation.isPending}
            >
              {updateItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Listing"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
