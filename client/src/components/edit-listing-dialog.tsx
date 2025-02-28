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

export default function EditListingDialog({ item, trigger }: EditListingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof insertItemSchema>>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      title: item.title,
      description: item.description ?? "",
      price: item.price ?? 0,
      isGift: item.isGift,
      imageUrl: item.imageUrl,
      communityId: item.communityId,
      userId: user?.id
    },
  });

  const queryClient = useQueryClient();

  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertItemSchema>) => {
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
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });
      toast({
        title: "Listing updated",
        description: "Your listing has been successfully updated.",
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating listing",
        description: error.message || "There was a problem updating your listing.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="secondary" 
            size="default"
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit Listing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>
            Update the details of your listing
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit((data) => {
              updateItemMutation.mutate(data);
            })} 
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your item"
                      className="resize-none"
                      {...field} 
                    />
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
                    <FormLabel>Free item</FormLabel>
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
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value || ""}
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