
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { insertItemSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { apiRequest } from "@/lib/queryClient";

interface CreateListingDialogProps {
  communities: (Community & { role: string; memberCount: number })[];
}

// Create a schema that combines the insert schema with additional fields
// Create a modified schema for the form that doesn't require imageFile
  const formSchema = z.object({
    ...insertItemSchema.shape,
    communityId: z.number({
      required_error: "Please select a community",
    }),
    imageFile: z.any().optional(), // Make imageFile optional in the form
  });

type FormData = z.infer<typeof formSchema>;

export default function CreateListingDialog({
  communities,
}: CreateListingDialogProps) {
  console.log("CreateListingDialog rendering", { communities });
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("https://images.unsplash.com/photo-1737282836845-555d9214dfe4");
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      isGift: true,
      imageUrl: "https://images.unsplash.com/photo-1737282836845-555d9214dfe4", // Default placeholder image
      userId: user?.id,
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
      setImagePreview("https://images.unsplash.com/photo-1737282836845-555d9214dfe4");
      setImageFile(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log("Form submitted with data:", data);
    
    // Log entire form state for debugging
    console.log("Form values:", form.getValues());
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "You must be logged in to create a listing.",
      });
      return;
    }

    if (!data.communityId) {
      form.setError("communityId", {
        type: "manual",
        message: "Please select a community",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Get values directly from form to ensure we have latest data
      const formValues = form.getValues();
      
      // Make sure we have the required fields and proper types
      const itemData = {
        title: formValues.title || "",
        description: formValues.description || "",
        isGift: Boolean(formValues.isGift),
        price: formValues.isGift ? 0 : (formValues.price || 0),
        imageUrl: formValues.imageUrl || "https://images.unsplash.com/photo-1737282836845-555d9214dfe4",
        userId: user.id,
        communityId: Number(formValues.communityId)
      };
      
      console.log("Submitting item data:", itemData);
      
      // Force title validation before submission
      if (!itemData.title || !itemData.title.trim()) {
        form.setError("title", {
          type: "manual",
          message: "Title is required",
        });
        toast({
          variant: "destructive",
          title: "Validation error",
          description: "Title is required",
        });
        setIsLoading(false);
        return;
      }

      // Check if we're using a FormData approach (with file) or JSON approach
      if (imageFile) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('title', itemData.title.trim());
        formData.append('description', itemData.description || '');
        formData.append('isGift', String(itemData.isGift));
        formData.append('price', itemData.isGift ? '0' : String(itemData.price || 0));
        formData.append('imageUrl', itemData.imageUrl);
        formData.append('userId', String(user.id));
        formData.append('communityId', String(itemData.communityId));
        formData.append('imageFile', imageFile);

        const response = await apiRequest("POST", "/api/items", formData, {
          // Don't set Content-Type header, let browser set it with boundary
        });
      } else {
        // Use JSON when no file is being uploaded
        const response = await apiRequest("POST", "/api/items", itemData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = "Failed to create listing";
        
        // Extract error message from Zod validation errors if available
        if (errorData.issues && errorData.issues.length > 0) {
          errorMessage = errorData.issues.map(issue => issue.message).join(", ");
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }
      }

      setOpen(false);
      form.reset();
      toast({
        title: "Listing created!",
        description: "Your item has been successfully listed.",
      });
      // Invalidate queries to refresh the item list
      queryClient.invalidateQueries(["/api/items"]);
    } catch (error) {
      console.error("Failed to create listing:", error);
      toast({
        variant: "destructive",
        title: "Failed to create listing",
        description: error instanceof Error ? error.message : "There was an error creating your listing. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Listing</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <DialogDescription>
            Add details about the item you want to share or sell
          </DialogDescription>
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
                        {imagePreview !== "https://images.unsplash.com/photo-1737282836845-555d9214dfe4" && (
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
                            htmlFor="create-image-upload"
                            className="relative cursor-pointer rounded-md bg-background font-semibold text-primary"
                          >
                            <span>Upload an image</span>
                            <input
                              id="create-image-upload"
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
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Listing"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
