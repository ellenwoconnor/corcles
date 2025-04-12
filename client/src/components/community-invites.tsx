
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export default function CommunityInvites() {
  const { data: invites } = useQuery({
    queryKey: ["/api/user/invites"],
  });

  if (!invites?.sent.length && !invites?.received.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {invites.received.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Received Invitations</CardTitle>
            <CardDescription>Invitations to join communities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invites.received.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{invite.communityMascot}</span>
                      <span className="font-medium">{invite.communityName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Invited by {invite.inviterName} on {format(new Date(invite.createdAt), "PP")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline">
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {invites.sent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sent Invitations</CardTitle>
            <CardDescription>Track your sent invitations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invites.sent.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{invite.communityMascot}</span>
                      <span className="font-medium">{invite.communityName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sent to {invite.invitedEmail}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {format(new Date(invite.createdAt), "PP")}
                    </div>
                  </div>
                  <Badge variant={invite.status === "pending" ? "secondary" : "default"}>
                    {invite.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
