import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DelistButtonProps {
  itemId: number;
  variant?: "outline" | "destructive" | "default";
}

export function DelistButton({ itemId, variant = "destructive" }: DelistButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const delistMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/items/${itemId}/delist`, "POST");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delist item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: [`/api/items/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/items"] });
      toast({
        title: "Item delisted",
        description: "The item has been removed from the marketplace.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Could not delist item",
      });
    },
  });

  return (
    <Button
      variant={variant}
      onClick={() => delistMutation.mutate()}
      disabled={delistMutation.isPending}
    >
      {delistMutation.isPending ? "Delisting..." : "Delist Item"}
    </Button>
  );
}
