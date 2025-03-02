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


interface ListingFormProps {
  mode: 'create' | 'edit';
  communities?: Array<{
    id: number;
    name: string;
    role: string;
    memberCount: number;
  }>;
  defaultValues?: any;
  onSubmit: (data: any, imageFile: File | null) => void;
  isLoading: boolean;
  schema: z.ZodType<any, any>;
  buttonText: string;
}

export function ListingForm({
  mode,
  communities = [],
  defaultValues = {},
  onSubmit,
  isLoading,
  schema,
  buttonText,
}: ListingFormProps) {
  const { user } = useAuth();
  const [imageFile, setImageFile] = useState<File | null>(null);

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
      ...defaultValues,
    },
  });

  const watchIsGift = form.watch('isGift');

  const handleSubmit = (data: any) => {
    onSubmit(data, imageFile);
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

        {mode === 'create' && communities.length > 0 && (
          <FormField
            control={form.control}
            name="communityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Community <span className="text-red-500">*</span></FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
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

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Loading..." : buttonText}
        </Button>
      </form>
    </Form>
  );
}