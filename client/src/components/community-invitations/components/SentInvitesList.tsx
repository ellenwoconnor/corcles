import { useState } from "react";
import { format } from "date-fns";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Mail,
  CircleX,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CommunityInvite } from "../hooks/useInvitations";

interface SentInvitesListProps {
  invites: CommunityInvite[];
  isLoading: boolean;
}

export default function SentInvitesList({
  invites,
  isLoading,
}: SentInvitesListProps) {
  const [expanded, setExpanded] = useState(false);

  // Don't render anything if there are no invites and not loading
  if (invites.length === 0 && !isLoading) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Invitation accepted</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "rejected":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <CircleX className="h-4 w-4 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Invitation declined</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "pending":
      default:
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Clock className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Waiting for response</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
    }
  };

  return (
    <div className="mt-4 mb-4">
      <Separator className="my-2" />
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium py-2 hover:text-primary transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>
            {invites.length} Invitation{invites.length !== 1 ? "s" : ""} Sent
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-muted-foreground text-center py-2">
              No invitations have been sent yet
            </p>
          ) : (
            <>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-3 border rounded-md flex items-center justify-between"
                >
                  <div className="overflow-hidden flex-1">
                    <div className="truncate font-medium">{invite.invitedEmail}</div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1 inline" />
                      {format(new Date(invite.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="ml-2">{getStatusIcon(invite.status)}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}