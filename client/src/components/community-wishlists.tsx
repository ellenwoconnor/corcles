import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type Wishlist } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Lock,
  Eye,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Slider from "react-slick";
import { useRef, useEffect, useState } from "react";

// Import Slick CSS in your component
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import FulfillWishlistDialog from "./fulfill-wishlist-dialog";

// Format time ago function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
}

export default function CommunityWishlists() {
  const { user } = useAuth();
  const sliderRef = useRef<Slider>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [selectedWishlist, setSelectedWishlist] = useState<
    Wishlist | undefined
  >(undefined);

  const { data: communityWishlists = [], isLoading } = useQuery<
    (Wishlist & { communityName?: string })[]
  >({
    queryKey: ["/api/communities/wishlists"],
    enabled: !!user,
  });

  const { data: communities = [] } = useQuery<any[]>({
    queryKey: ["/api/user/communities"],
    enabled: !!user,
  });
  
  // Get user items to check if they've already fulfilled wishlists
  const { data: userItems = [] } = useQuery<any[]>({
    queryKey: ["/api/user/items"],
    enabled: !!user,
  });
  
  // Filter items that were created to fulfill wishlists (those with recipients)
  const fulfilledWishlistItems = userItems.filter(item => item.recipientId);

  // Handle window resize to adjust carousel settings
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Associate community names with wishlists
  const wishlistsWithCommunityNames = communityWishlists.map((wishlist) => {
    const community = communities.find((c) => c.id === wishlist.communityId);
    return {
      ...wishlist,
      communityName: community?.name || "Unknown Community",
    };
  });

  // Determine slides to show based on window width
  const getSlidesToShow = () => {
    if (windowWidth < 640) return 1;
    if (windowWidth < 1024) return 2;
    return 3;
  };

  // Carousel settings
  const settings = {
    dots: true,
    infinite: wishlistsWithCommunityNames.length > getSlidesToShow(),
    speed: 500,
    slidesToShow: getSlidesToShow(),
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  // Check if wishlist has already been fulfilled by the current user
  const hasUserFulfilledWishlist = (wishlistUserId: number) => {
    return fulfilledWishlistItems.some(item => item.recipientId === wishlistUserId);
  };

  const onFulfillWishlist = (wishlist: Wishlist) => {
    // Skip confirmation dialog and go straight to item creation
    setSelectedWishlist(wishlist);
    setCreateItemDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (wishlistsWithCommunityNames.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No community wishlists</h2>
        <p className="text-muted-foreground">
          Join more communities to see what others are looking for
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-6">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-md"
            onClick={() => sliderRef.current?.slickPrev()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-10">
          <Slider ref={sliderRef} {...settings}>
            {wishlistsWithCommunityNames.map((wishlist) => (
              <div key={wishlist.id} className="px-2">
                <Card className="h-[300px] flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2 text-lg line-clamp-1">
                      {wishlist.title}
                      {wishlist.isPrivate && (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 h-10">
                      {wishlist.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-grow justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Users className="h-3 w-3" /> {wishlist.communityName}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {wishlist.budget && (
                          <Badge variant="secondary">
                            Budget: ${wishlist.budget}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="text-xs text-muted-foreground mb-2">
                        Posted {formatTimeAgo(new Date(wishlist.createdAt))}
                      </div>
                      {hasUserFulfilledWishlist(wishlist.userId) ? (
                        <Button variant="outline" disabled className="w-full">
                          Already Fulfilled
                        </Button>
                      ) : (
                        <Button onClick={() => onFulfillWishlist(wishlist)} className="w-full">
                          Fulfill
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </Slider>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-md"
            onClick={() => sliderRef.current?.slickNext()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <FulfillWishlistDialog
        open={createItemDialogOpen}
        onClose={() => setCreateItemDialogOpen(false)}
        wishlist={selectedWishlist}
      />
    </div>
  );
}
