import { useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, Loader2 } from "lucide-react";

interface ListingFormProps {
  mode: "create" | "edit";
  communities?: Array<{
    id: number;
    name: string;
    role: string;
    memberCount: number;
  }>;
  schema: z.ZodType<any>;
  defaultValues?: Record<string, any>;
  onSubmit: (data: any, imageFile: File | null) => Promise<void>;
  isLoading: boolean;
  buttonText: string;
}

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1737282836845-555d9214dfe4";

export function ListingForm({
  mode,
  communities = [],
  defaultValues,
  onSubmit,
  isLoading,
  schema,
  buttonText,
}: ListingFormProps) {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    defaultValues?.imageUrl || PLACEHOLDER_IMAGE
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      isGift: true,
      imageUrl: PLACEHOLDER_IMAGE,
      userId: user?.id,
      ...defaultValues
    },
  });

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      form.setValue('imageUrl', ''); // Clear the imageUrl when we have a file
    } else {
      setImagePreview(defaultValues?.imageUrl || PLACEHOLDER_IMAGE);
      setImageFile(null);
      form.setValue('imageUrl', PLACEHOLDER_IMAGE); // Reset to placeholder when no file
    }
  };

  const handleSubmit = async (data: any) => {
    // Get the current form values
    const formValues = form.getValues();

    // Validate title manually before submission
    if (!formValues.title || formValues.title.trim() === '') {
      form.setError("title", {
        type: "manual",
        message: "Title is required"
      });
      return;
    }

    // Extract the actual uploaded image file if it exists
    await onSubmit(formValues, imageFile);
  };

  const isGift = form.watch("isGift");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="What are you listing?" {...field} />
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
                  placeholder="Describe your item (condition, size, etc.)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === "create" && communities && communities.length > 0 && (
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
                <FormLabel>Free Item</FormLabel>
                <FormDescription>
                  Is this item being offered for free?
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

        {!isGift && (
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : Number(value));
                    }}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center rounded-lg border p-4">
                  <div
                    style={{
                      backgroundImage: `url(${imagePreview})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-32 w-full rounded-md"
                  />
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        handleImageChange(file);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                      handleImageChange(null);
                    }}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Use Default
                  </Button>
                </div>
              </div>
              <FormDescription>
                Upload an image of your item or use our default image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {buttonText === 'Create Listing' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              buttonText
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}