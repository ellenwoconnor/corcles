import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertItemSchema, type Community } from "@shared/schema";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { DollarSign, Gift, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1737282836845-555d9214dfe4",
  "https://images.unsplash.com/photo-1523194258983-4ef0203f0c47",
  "https://images.unsplash.com/photo-1477921749929-1b7a5d38b68a",
  "https://images.unsplash.com/photo-1545147508-91576a5343a2",
  "https://images.unsplash.com/photo-1737476813012-054eb34c53a9",
  "https://images.unsplash.com/photo-1725278484721-b20373781f43",
  "https://images.unsplash.com/photo-1509266145091-5e3e5ef88bc1",
  "https://images.unsplash.com/photo-1627562309156-3056abea4fe9",
];

interface CreateListingDialogProps {
  communities: (Community & { role: string; memberCount: number })[];
}

const formSchema = insertItemSchema.extend({
  communityId: z.number({
    required_error: "Please select a community",
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateListingDialog({ communities }: CreateListingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      price: undefined,
      isGift: true,
      imageUrl: MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)],
      communityId: undefined,
    },
    mode: "onChange"
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/items", {
        ...data,
        price: data.isGift ? null : data.price,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create listing");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Listing created successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create listing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create listing",
        variant: "destructive",
      });
    }
  });

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          form.reset();
        }
        setOpen(newOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button>Create Listing</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <DialogDescription>
            Add details about the item you want to sell or gift
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              createItemMutation.mutate(data);
            })}
            className="space-y-4"
          >
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
                  <FormDescription>
                    Choose which community to list this item in
                  </FormDescription>
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the item's brand, dimensions, condition, or other relevant information."
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
                <FormItem>
                  <div className="flex items-center gap-2 mb-4">
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) form.setValue("price", undefined);
                      }}
                    />
                    <FormLabel className="!mt-0">Free item</FormLabel>
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
                        min="0"
                        step="0.01"
                        placeholder="Enter price in dollars (minimum $0.01)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
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
              disabled={createItemMutation.isPending}
            >
              {createItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Listing"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}