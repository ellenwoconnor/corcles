import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Copy, Share, RefreshCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface InviteLinkSectionProps {
  inviteLink: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  userRole: string;
  communityName: string;
  onRegenerateLink: () => void;
  isRegenerating: boolean;
  onRefetch: () => void;
}

export function InviteLinkSection({
  inviteLink,
  isLoading,
  isError,
  errorMessage,
  userRole,
  communityName,
  onRegenerateLink,
  isRegenerating,
  onRefetch,
}: InviteLinkSectionProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  // Reset copied state when link changes
  useEffect(() => {
    setCopied(false);
  }, [inviteLink]);

  // Copy invite link to clipboard
  const copyToClipboard = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
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

  // Share link using Web Share API if available
  const handleShare = async () => {
    if (!inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${communityName} on Corcles`,
          text: `I'm inviting you to join ${communityName} on Corcles! Click the link to join:`,
          url: inviteLink,
        });
        toast({
          title: "Shared successfully",
          description: "Invite link has been shared",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
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
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
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
          <p className="text-sm text-destructive mb-4">{errorMessage || "Could not load invite link"}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onRefetch}>
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
          Share this link to invite others to join {communityName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground mb-1">
            Share this link with others to let them join {communityName}:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <code className="font-mono text-sm flex-1 p-2 bg-muted rounded-md border overflow-hidden overflow-ellipsis whitespace-nowrap">
              {inviteLink}
            </code>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="shrink-0"
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {userRole === "admin" && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-2">Admin Options</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Need a new invite link? Regenerating will invalidate the current link.
              </p>

              <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
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
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate New Invite Link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate the current invite link. Anyone with the old link will no longer be able to join the community.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onRegenerateLink();
                        setRegenerateDialogOpen(false);
                      }}
                    >
                      Generate New Link
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default InviteLinkSection;