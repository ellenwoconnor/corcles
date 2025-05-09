import { useQuery } from "@tanstack/react-query";

interface CommunityInviteLinkProps {
  communityId: number;
}

export default function CommunityInviteLink({ communityId }: CommunityInviteLinkProps) {
  const { data } = useQuery({
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

  const getInviteLink = () => {
    if (!data?.inviteCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/communities/join?code=${data.inviteCode}`;
  };

  return getInviteLink();
}