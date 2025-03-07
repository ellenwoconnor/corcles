
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink, Gift, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Format time ago function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

export default function ListingsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userItems = [], isLoading: isLoadingUserItems } = useQuery<any[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-12 px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">My Listings</h1>
            <p className="text-muted-foreground">
              Manage items you've posted
            </p>
          </div>
          <div>
            <Button onClick={() => setLocation("/items/new")}>Create Listing</Button>
          </div>
        </div>

        {isLoadingUserItems ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : userItems.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
            <p className="text-muted-foreground">
              Create your first listing to share items with your community
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="relative aspect-square">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="object-cover w-full h-full"
                  />
                  {item.isGift && (
                    <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                      Free
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!item.isGift && (
                    <p className="text-lg font-bold text-primary">${item.price}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Posted {formatTimeAgo(new Date(item.createdAt))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex items-center gap-2"
                    onClick={() => setLocation(`/item/${item.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
