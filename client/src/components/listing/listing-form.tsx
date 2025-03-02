
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { X, Image as ImageIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Gift, Loader2 } from "lucide-react";

interface ListingFormProps {
  mode: 'create' | 'edit';
  communities?: { id: number; name: string }[];
  defaultValues?: any;
  onSubmit: (data: any, imageFile: File | null) => Promise<void>;
  isLoading: boolean;
  schema: z.ZodObject<any>;
  buttonText: string;
}

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
    defaultValues?.imageUrl || "https://images.unsplash.com/photo-1737282836845-555d9214dfe4"
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      isGift: true,
      imageUrl: "https://images.unsplash.com/photo-1737282836845-555d9214dfe4",
      userId: user?.id,
      ...defaultValues
    },
  });

  const isGift = form.watch("isGift");

  const handleImageChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
    } else {
      setImagePreview(defaultValues?.imageUrl || "https://images.unsplash.com/photo-1737282836845-555d9214dfe4");
      setImageFile(null);
    }
  };

  const handleSubmit = async (data: any) => {
    await onSubmit(data, imageFile);
  };

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
        
        {mode === 'create' && communities.length > 0 && (
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
                    {imagePreview !== "https://images.unsplash.com/photo-1737282836845-555d9214dfe4" && 
                     imagePreview !== defaultValues?.imageUrl && (
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
                        htmlFor={`${mode}-image-upload`}
                        className="relative cursor-pointer rounded-md bg-background font-semibold text-primary"
                      >
                        <span>Upload an image</span>
                        <input
                          id={`${mode}-image-upload`}
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleImageChange(file || null);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FormControl>
        </FormItem>
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
                <FormLabel>
                  <div className="flex items-center space-x-2">
                    <Gift className="h-4 w-4" />
                    <span>Free item</span>
                  </div>
                </FormLabel>
                <FormDescription>
                  Check this if you're offering this item for free
                </FormDescription>
              </div>
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
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-8"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(isNaN(value) ? 0 : value);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
