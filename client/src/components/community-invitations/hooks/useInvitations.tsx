import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface CommunityInvite {
  id: number;
  communityId: number;
  invitedEmail: string;
  status: string;
  createdAt: string;
  communityName?: string;
  communityMascot?: string;
  inviterName?: string;
}

export interface InvitesData {
  sent: CommunityInvite[];
  received: CommunityInvite[];
}

export function useInvitations(communityId: number) {
  const { toast } = useToast();
  
  // Fetch all user invites
  const {
    data: invitesData,
    isLoading: isInvitesLoading,
    isError: isInvitesError,
    error: invitesError
  } = useQuery<InvitesData>({
    queryKey: ["/api/user/invites"],
  });
  
  // Fetch community invite code
  const {
    data: inviteCodeData,
    isLoading: isInviteCodeLoading,
    isError: isInviteCodeError,
    error: inviteCodeError,
    refetch: refetchInviteCode
  } = useQuery({
    queryKey: ["/api/communities", communityId, "invite-code"],
    queryFn: async () => {
      const res = await fetch(`/api/communities/${communityId}/invite-code`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch invite code");
      }
      return res.json();
    },
  });
  
  // Filter invites for this community
  const sentInvites = invitesData?.sent?.filter(
    invite => invite.communityId === communityId
  ) || [];
  
  // Mutation to regenerate invite code
  const regenerateInviteCode = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/communities/${communityId}/invite-code`
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invite code regenerated",
        description: "A new invite code has been generated for this community.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/communities", communityId, "invite-code"],
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to regenerate invite code",
        description: err.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to send email invite
  const sendEmailInvite = useMutation({
    mutationFn: async (data: { invitedEmail: string; message?: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/communities/${communityId}/invite`, 
        data
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.autoEnrolled ? "User enrolled" : "Invitation sent",
        description: data.autoEnrolled 
          ? "The user has been automatically enrolled in the community."
          : "The invitation has been sent successfully.",
      });
      
      // Invalidate invites query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["/api/user/invites"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Get invite link from code
  const getInviteLink = () => {
    if (!inviteCodeData?.inviteCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/communities/join?code=${inviteCodeData.inviteCode}`;
  };
  
  return {
    // Data
    sentInvites,
    inviteCode: inviteCodeData?.inviteCode,
    inviteLink: getInviteLink(),
    
    // Loading states
    isInvitesLoading,
    isInviteCodeLoading,
    
    // Error states
    isInvitesError,
    isInviteCodeError,
    invitesError,
    inviteCodeError,
    
    // Actions
    regenerateInviteCode,
    sendEmailInvite,
    refetchInviteCode
  };
}