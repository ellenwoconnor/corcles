import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <a className="font-semibold">Community Exchange</a>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/profile">
                <Button variant="ghost">My Profile</Button>
              </Link>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button>Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
