import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

interface CommunityInvite {
  id: number;
  communityId: number;
  invitedEmail: string;
  status: string;
  createdAt: string;
  communityName: string;
  communityMascot: string;
}

interface InvitesData {
  sent: CommunityInvite[];
  received: CommunityInvite[];
}

interface CommunityInvitesListProps {
  communityId: number;
}

export default function CommunityInvitesList({
  communityId,
}: CommunityInvitesListProps) {
  const [expanded, setExpanded] = useState(false);

  // Use the existing /api/user/invites endpoint but filter by communityId on client side
  const { data, isLoading } = useQuery<InvitesData>({
    queryKey: ["/api/user/invites"],
  });

  // Filter invites by communityId
  const invites =
    data?.sent?.filter((invite) => invite.communityId === communityId) || [];

  // Don't render anything if there are no invites
  if (invites.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-2">
      <Separator className="my-2" />
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium py-1 hover:text-primary transition-colors"
      >
        <span>
          {invites.length} Invitation{invites.length !== 1 ? "s" : ""} Sent
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          {isLoading ? (
            <div className="py-2 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading...</span>
            </div>
          ) : (
            <>
              {invites.map((invite: CommunityInvite) => (
                <div key={invite.id} className=" py-2">
                  <div className="flex justify-between items-start">
                    <div className="overflow-hidden">
                      <div className="truncate">{invite.invitedEmail}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        {format(new Date(invite.createdAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="ml-2 text-muted-foreground">
                      {invite.status === "accepted" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
