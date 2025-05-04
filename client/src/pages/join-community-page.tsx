import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function JoinCommunityPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  
  // Extract the invite code from the URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      // Store the invite code in localStorage for use after registration
      localStorage.setItem("pendingInviteCode", code);
      setInviteCode(code);
    }
  }, []);
  
  // Define the mutation for joining a community
  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/communities/join", { inviteCode: code });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to join community");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message || `You've joined ${data.community.name}`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user/communities'] });
      
      // Redirect to communities page after a short delay
      setTimeout(() => {
        navigate("/communities");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join community",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle the join button click
  const handleJoin = () => {
    if (!inviteCode) return;
    joinMutation.mutate(inviteCode);
  };
  
  // Loading state while checking authentication
  if (authLoading) {
    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Checking Authentication</CardTitle>
            <CardDescription>Please wait while we verify your account...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If user is not logged in, prompt them to do so
  if (!user) {
    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Join Community</CardTitle>
            <CardDescription>You need to be logged in to join a community</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="default" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                Please log in or create an account to join this community.
                Your invite link will still be valid after you log in.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate(`/auth?redirect=${encodeURIComponent(location)}`)}>
              Log In or Register
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // No invite code provided
  if (!inviteCode) {
    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Invalid Invite Link</CardTitle>
            <CardDescription>No invite code was found in the URL</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Invite Code</AlertTitle>
              <AlertDescription>
                The link you followed doesn't contain a valid invite code.
                Please ask for a new invite link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/communities")}>
              Go to My Communities
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-lg py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Join Community</CardTitle>
          <CardDescription>
            You're about to join a community with the invite code: 
            <span className="font-mono text-primary mx-2">{inviteCode}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {joinMutation.isError && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {joinMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
          
          {joinMutation.isSuccess && (
            <Alert variant="default" className="my-4 bg-green-50 border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                You have successfully joined the community.
                You'll be redirected to your communities page shortly.
              </AlertDescription>
            </Alert>
          )}
          
          {!joinMutation.isSuccess && (
            <p className="py-4 text-center text-muted-foreground">
              Click the button below to join this community.
              Once you join, you'll be able to see all shared items and participate in the community.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {!joinMutation.isSuccess && (
            <>
              <Button variant="outline" onClick={() => navigate("/communities")}>
                Cancel
              </Button>
              <Button 
                onClick={handleJoin} 
                disabled={joinMutation.isPending}
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Community"
                )}
              </Button>
            </>
          )}
          
          {joinMutation.isSuccess && (
            <Button onClick={() => navigate("/communities")}>
              Go to My Communities
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}