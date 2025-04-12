import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Clock, X, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CommunityInvite {
  id: number;
  communityId: number;
  invitedBy: number;
  invitedEmail: string;
  status: string;
  createdAt: string;
  communityName: string;
  communityMascot: string;
  inviterName?: string;
}

interface InvitesData {
  sent: CommunityInvite[];
  received: CommunityInvite[];
}

export default function ReceivedInvitesSection() {
  const { toast } = useToast();
  const [processingInviteId, setProcessingInviteId] = useState<number | null>(
    null,
  );

  const { data, isLoading, isError } = useQuery<InvitesData>({
    queryKey: ["/api/user/invites"],
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/community-invites/${inviteId}/accept`,
        {},
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invitation");
      }
      return response.json();
    },
    onMutate: (inviteId) => {
      setProcessingInviteId(inviteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/communities"] });
      toast({
        title: "Invitation accepted",
        description: "You have joined the community successfully",
      });
      setProcessingInviteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
      setProcessingInviteId(null);
    },
  });

  const rejectInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/community-invites/${inviteId}/reject`,
        {},
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject invitation");
      }
      return response.json();
    },
    onMutate: (inviteId) => {
      setProcessingInviteId(inviteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/invites"] });
      toast({
        title: "Invitation rejected",
        description: "The invitation has been declined",
      });
      setProcessingInviteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject invitation",
        description: error.message,
        variant: "destructive",
      });
      setProcessingInviteId(null);
    },
  });

  // Filter received invites that are pending
  const pendingInvites =
    data?.received?.filter(
      (invite: CommunityInvite) => invite.status === "pending",
    ) || [];

  // If there are no pending invites, don't render the section
  if (pendingInvites.length === 0 && !isLoading) {
    return null;
  }

  if (isError) {
    return (
      <Card className="my-6">
        <CardHeader>
          <CardTitle className="text-lg">Community Invitations</CardTitle>
          <CardDescription>Error loading invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            There was a problem loading your invitations. Please try again
            later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Community Invitations
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription>
          You have {pendingInvites.length} pending invitation
          {pendingInvites.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
          </div>
        ) : (
          <div className="space-y-4">
            {pendingInvites.map((invite: CommunityInvite) => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{invite.communityMascot}</span>
                    <span className="font-medium">{invite.communityName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Invited by{" "}
                    <span className="font-medium">{invite.inviterName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center mt-1">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    {format(new Date(invite.createdAt), "MMMM d, yyyy")}
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-center mt-2 sm:mt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acceptInviteMutation.mutate(invite.id)}
                    disabled={processingInviteId === invite.id}
                  >
                    {processingInviteId === invite.id &&
                    acceptInviteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectInviteMutation.mutate(invite.id)}
                    disabled={processingInviteId === invite.id}
                  >
                    {processingInviteId === invite.id &&
                    rejectInviteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <X className="h-4 w-4 mr-1" />
                    )}
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
