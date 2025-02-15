import { Item } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

type ItemCardProps = {
  item: Item;
};

export default function ItemCard({ item }: ItemCardProps) {
  const { user } = useAuth();

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "POST",
        `/api/items/${item.id}/${item.favorites > 0 ? "unfavorite" : "favorite"}`,
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [`/api/items/${item.community}`] });
      const previousItems = queryClient.getQueryData<Item[]>([`/api/items/${item.community}`]);

      queryClient.setQueryData<Item[]>([`/api/items/${item.community}`], (old) => {
        if (!old) return [];
        return old.map(oldItem => 
          oldItem.id === item.id 
            ? { ...oldItem, favorites: oldItem.favorites > 0 ? 0 : 1 }
            : oldItem
        );
      });

      return { previousItems };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData([`/api/items/${item.community}`], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/items/${item.community}`] });
    },
  });

  return (
    <Link href={`/item/${item.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-0">
          <div className="aspect-square relative">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="object-cover w-full h-full"
            />
            {item.isGift && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm font-medium">
                Free
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-1 truncate">{item.title}</h3>
            {!item.isGift && (
              <p className="text-lg font-bold text-primary">${item.price}</p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {item.description}
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/avatar.jpg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (user) {
                favoriteMutation.mutate();
              }
            }}
            disabled={!user || favoriteMutation.isPending}
          >
            <Heart
              className={`h-4 w-4 mr-1 ${
                item.favorites > 0 ? "fill-primary" : ""
              }`}
            />
            {item.favorites}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}