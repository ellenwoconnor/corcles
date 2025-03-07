import { useAuth } from "@/features/auth/hooks/use-auth";
import RobotLogo from "@/components/robot-logo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Users, Gift } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { Button as Button2 } from "./ui/button"; //This import might need adjustment depending on the project structure.
import CorclesLogo from "./corcles-logo"; //This import assumes CorclesLogo is in the same directory. Adjust path as needed.


export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-24 items-center px-8">
        <div className="mr-4">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CorclesLogo width={40} height={40} />
              <span className="text-2xl font-bold uppercase tracking-wide">C<span className="text-[#6ABF69]">O</span>RCLES</span>
            </div>
            <RobotLogo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link href="/communities">
              <Button2 variant="ghost" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Communities</span>
              </Button2>
            </Link>
            <Link href="/wishlists">
              <Button2 variant="ghost" className="flex items-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>Wishlists</span>
              </Button2>
            </Link>
          </div>
          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button2
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
                </Button2>
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
                <DropdownMenuItem onClick={() => logout()}>
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