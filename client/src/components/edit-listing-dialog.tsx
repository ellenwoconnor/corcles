import { z } from "zod";
import { Loader2, Pencil, Image as ImageIcon, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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

// Create a schema that makes the image optional for editing
const editSchema = z.object({
  ...insertItemSchema.shape,
  imageFile: z.instanceof(File).optional(),
});

type FormData = z.infer<typeof editSchema>;

export function EditListingDialog({
  item,
  trigger,
}: EditListingDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(item.imageUrl);

  const form = useForm<FormData>({
    resolver: zodResolver(editSchema.omit({ imageFile: true })),
    defaultValues: {
      title: item.title,
      description: item.description || "",
      price: item.price || 0,
      isGift: !!item.isGift,
      imageUrl: item.imageUrl,
      userId: item.userId,
      communityId: item.communityId,
      imageFile: undefined, // Add default value for imageFile
    },
  });

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('imageFile', file);
    } else {
      setImagePreview(item.imageUrl);
      form.setValue('imageFile', undefined);
    }
  };

  const updateItemMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('isGift', String(data.isGift));
      formData.append('price', data.isGift ? '0' : String(data.price || 0));
      formData.append('communityId', String(item.communityId));
      formData.append('userId', String(user?.id));

      if (data.imageFile) {
        formData.append('imageFile', data.imageFile);
      }

      const response = await apiRequest("PATCH", `/api/items/${item.id}`, formData, {
        // Don't set Content-Type header, let the browser set it with the boundary
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update item");
      }
      return response.json();
    },
    onSuccess: () => {
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

  const handleSubmit = (values: FormData) => {
    console.log('Form submitted with values:', values);
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
              name="imageFile"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Item Image</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="flex justify-center px-6 py-10 border-2 border-dashed rounded-lg border-border">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-h-[200px] rounded-lg object-cover"
                            />
                            {imagePreview !== item.imageUrl && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => handleImageChange(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                            <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                              <label
                                htmlFor="image-upload"
                                className="relative cursor-pointer rounded-md bg-background font-semibold text-primary"
                              >
                                <span>Upload a new image</span>
                                <input
                                  id="image-upload"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    handleImageChange(file || null);
                                  }}
                                  {...field}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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