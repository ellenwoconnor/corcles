import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Share, Copy, Check, RefreshCcw } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CommunityInviteLinkProps {
  communityId: number;
  communityName: string;
  userRole: string;
}

export default function CommunityInviteLink({ 
  communityId, 
  communityName,
  userRole
}: CommunityInviteLinkProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Query to fetch the community's invite code
  const { 
    data, 
    isLoading,
    isError, 
    error 
  } = useQuery({
    queryKey: ['/api/communities', communityId, 'invite-code'],
    queryFn: async () => {
      const res = await fetch(`/api/communities/${communityId}/invite-code`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch invite code");
      }
      return res.json();
    },
  });

  // Mutation to generate a new invite code
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/communities/${communityId}/invite-code`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invite code regenerated",
        description: "A new invite code has been generated for this community.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'invite-code'] });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to regenerate invite code",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Generate the shareable link using the invite code
  const getInviteLink = () => {
    if (!data?.inviteCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/communities/join?code=${data.inviteCode}`;
  };

  // Copy the invite link to clipboard
  const copyToClipboard = async () => {
    const link = getInviteLink();
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Invite link copied to clipboard",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Handle sharing with the Web Share API if available
  const handleShare = async () => {
    const link = getInviteLink();
    if (!link) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${communityName} on Corcles`,
          text: `I'm inviting you to join ${communityName} on Corcles! Click the link to join:`,
          url: link,
        });
        toast({
          title: "Shared successfully",
          description: "Invite link has been shared",
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({
            title: "Failed to share",
            description: "Could not share the invite link",
            variant: "destructive",
          });
        }
      }
    } else {
      copyToClipboard();
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Community Invite Link</CardTitle>
          <CardDescription>Loading invite link...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Community Invite Link</CardTitle>
          <CardDescription>Error loading invite link</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'invite-code'] })}>
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Community Invite Link</CardTitle>
        <CardDescription>
          Share this link with others to invite them to join {communityName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            value={getInviteLink()} 
            readOnly 
            className="font-mono text-sm"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={copyToClipboard}
            title="Copy link"
          >
           {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleShare}
            title="Share link"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
        
        {userRole === "admin" && (
          <div className="text-xs text-muted-foreground">
            <p>As an admin, you can generate a new invite link if needed. This will invalidate the previous link.</p>
          </div>
        )}
      </CardContent>
      
      {userRole === "admin" && (
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Generate New Link
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}