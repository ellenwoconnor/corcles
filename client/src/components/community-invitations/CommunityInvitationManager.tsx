import { useInvitations } from "./hooks/useInvitations";
import { InviteLinkSection } from "./components/InviteLinkSection";
import SentInvitesList from "./components/SentInvitesList";
import EmailInviteDialog from "./components/EmailInviteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface CommunityInvitationManagerProps {
  communityId: number;
  communityName: string;
  userRole: string;
  isCustomCommunity: boolean;
}

export default function CommunityInvitationManager({
  communityId,
  communityName,
  userRole,
  isCustomCommunity,
}: CommunityInvitationManagerProps) {
  const {
    sentInvites,
    inviteLink,
    isInvitesLoading,
    isInviteCodeLoading,
    isInvitesError,
    isInviteCodeError,
    inviteCodeError,
    regenerateInviteCode,
    sendEmailInvite,
    refetchInviteCode,
  } = useInvitations(communityId);

  // Only show the component if it's a custom community or user is admin
  if (!isCustomCommunity && userRole !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-4 my-4">
      <h3 className="text-lg font-semibold">Invite Members</h3>
      
      <Tabs defaultValue="invite-link" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invite-link">Invite Link</TabsTrigger>
          <TabsTrigger value="sent-invites">
            Sent Invites ({sentInvites.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="invite-link" className="mt-4">
          <InviteLinkSection
            inviteLink={inviteLink}
            isLoading={isInviteCodeLoading}
            isError={isInviteCodeError}
            errorMessage={inviteCodeError?.message}
            userRole={userRole}
            communityName={communityName}
            onRegenerateLink={regenerateInviteCode.mutate}
            isRegenerating={regenerateInviteCode.isPending}
            onRefetch={refetchInviteCode}
          />
          
          <div className="mt-4 flex justify-center">
            <EmailInviteDialog 
              communityName={communityName}
              isCustomCommunity={isCustomCommunity}
              sendInvite={sendEmailInvite}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="sent-invites" className="mt-4">
          {sentInvites.length === 0 && !isInvitesLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No invitations have been sent yet</p>
              <p className="text-sm mt-1">
                Use the "Email Invite" button to invite new members
              </p>
              
              <div className="mt-4 flex justify-center">
                <EmailInviteDialog 
                  communityName={communityName}
                  isCustomCommunity={isCustomCommunity}
                  sendInvite={sendEmailInvite}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sentInvites.map((invite) => (
                <div key={invite.id} className="p-3 border rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{invite.invitedEmail}</div>
                      <div className="text-sm text-muted-foreground">
                        Sent: {new Date(invite.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      <span
                        className={
                          invite.status === "accepted"
                            ? "text-green-600 dark:text-green-500"
                            : invite.status === "rejected"
                            ? "text-red-600 dark:text-red-500"
                            : "text-amber-600 dark:text-amber-500"
                        }
                      >
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {isInvitesLoading && (
                <div className="text-center py-4 text-muted-foreground">
                  Loading invitations...
                </div>
              )}
              
              <div className="mt-6 flex justify-center">
                <EmailInviteDialog 
                  communityName={communityName}
                  isCustomCommunity={isCustomCommunity}
                  sendInvite={sendEmailInvite}
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <Separator className="my-4" />
    </div>
  );
}