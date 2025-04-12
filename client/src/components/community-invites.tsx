
import ReceivedInvitesSection from "./received-invites-section";

// This component is now just a wrapper for ReceivedInvitesSection
// We're keeping it as a separate component for backwards compatibility
export default function CommunityInvites() {
  return <ReceivedInvitesSection />;
}
