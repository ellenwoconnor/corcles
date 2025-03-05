import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { insertItemSchema, type Item } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Base schema for both create and edit
export const baseItemSchema = {
  ...insertItemSchema._def.schema.shape,
  imageFile: z.any().optional(),
};

// Create specific schema
export const createItemSchema = z.object({
  ...baseItemSchema,
  communityId: z.number({
    required_error: "Please select a community",
  }),
  pickupLocation: z.string().min(1, "Pickup location is required"),
});

// Edit specific schema
export const editItemSchema = z.object({
  ...baseItemSchema,
  pickupLocation: z.string().min(1, "Pickup location is required"),
});

export type FormData = z.infer<typeof createItemSchema>;

interface ListingFormProps {
  mode: 'create' | 'edit';
  itemId?: number;
  communities?: Array<{
    id: number;
    name: string;
    role: string;
    memberCount: number;
  }>;
  defaultValues?: any;
  onSuccess?: () => void;
  isLoading?: boolean;
  buttonText: string;
}

export function ListingForm({
  mode,
  itemId,
  communities = [],
  defaultValues = {},
  onSuccess,
  isLoading: externalLoading,
  buttonText,
}: ListingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);

  const schema = mode === 'create' ? createItemSchema : editItemSchema;

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      isGift: true,
      imageUrl: '',
      userId: user?.id,
      communityId: defaultValues.communityId || (communities.length > 0 ? communities[0].id : undefined),
      pickupLocation: defaultValues.pickupLocation || "",
      ...defaultValues,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) {
        throw new Error("Authentication required");
      }

      const formData = new FormData();

      if (!data.title) {
        throw new Error("Title is required");
      }

      if (mode === 'create' && !data.communityId) {
        throw new Error("Community selection is required");
      }

      formData.append("title", data.title.trim());
      formData.append("description", data.description || "");
      formData.append("isGift", String(data.isGift));
      formData.append("price", data.isGift ? "0" : String(data.price || 0));
      formData.append("userId", String(user.id));

      if (mode === 'create') {
        formData.append("communityId", String(data.communityId));
      }

      formData.append(
        "imageUrl",
        data.imageUrl || "https://images.unsplash.com/photo-1737282836845-555d9214dfe4"
      );
      formData.append("pickupLocation", data.pickupLocation);

      if (imageFile) {
        formData.append("imageFile", imageFile);
      }

      const method = mode === 'create' ? 'POST' : 'PATCH';
      const endpoint = mode === 'create' ? '/api/items' : `/api/items/${itemId}`;

      const response = await apiRequest(method, endpoint, formData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${mode} listing`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      if (itemId) {
        queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });

      toast({
        title: "Success!",
        description: `Your listing has been ${mode === 'create' ? 'created' : 'updated'}.`,
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const watchIsGift = form.watch('isGift');

  const handleSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input {...field} required placeholder="Enter item title" />
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
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === 'create' && (
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
                    {communities.map((community) => (
                      <SelectItem
                        key={community.id}
                        value={community.id.toString()}
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
        )}

        <FormField
          control={form.control}
          name="isGift"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Free item</FormLabel>
                <FormDescription>
                  Switch on if you're giving this away for free
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

        {!watchIsGift && (
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
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value}
                  onChange={(url) => field.onChange(url)}
                  onFileChange={handleImageChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pickupLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup Location <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter pickup location" {...field} required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={mutation.isPending || externalLoading} 
          className="w-full"
        >
          {mutation.isPending || externalLoading ? "Loading..." : buttonText}
        </Button>
      </form>
    </Form>
  );
}