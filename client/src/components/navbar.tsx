import { useAuth } from "@/features/auth/hooks/use-auth";
import GrowthLogo from "@/components/growth-logo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Menu, User, Users, Gift } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-24 items-center px-8">
        <div className="mr-4">
          <Link href="/" className="mr-6 flex items-center">
            <span className="text-3xl font-bold uppercase tracking-wide">C<span className="text-[#6ABF69]">O</span>RCLES</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link href="/communities">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Communities</span>
              </Button>
            </Link>
            <Link href="/wishlists">
              <Button variant="ghost" className="flex items-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>Wishlists</span>
              </Button>
            </Link>
          </div>
          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.avatarUrl || undefined}
                      alt={user?.displayName}
                    />
                    <AvatarFallback>
                      {user?.displayName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/communities" className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Communities</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/wishlists" className="flex items-center">
                    <Gift className="mr-2 h-4 w-4" />
                    <span>Wishlists</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </nav>
  );
}