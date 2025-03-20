
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsOfService() {
  return (
    <ScrollArea className="h-[500px] p-4 border rounded-lg bg-white">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Corcles Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Effective Date: 3/19/25</p>
        
        <p>Welcome to Corcles! Corcles ("the Platform") is a community-driven marketplace that enables users to give, receive, and exchange items within their local circles. By accessing or using Corcles, you agree to the following Terms of Service ("Terms").</p>
        
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>By using Corcles, you confirm that you are at least 18 years old (or the age of majority in your jurisdiction) and that you agree to abide by these Terms. If you do not agree, please do not use the Platform.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">2. Platform Role & Liability Disclaimer</h2>
          <p>Corcles is a facilitator of peer-to-peer exchanges and does not own, inspect, verify, or guarantee any item, user, or transaction. By using the Platform, you agree that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All transactions are solely between users. Corcles is not responsible for any damage, fraud, misrepresentation, safety issues, or disputes that arise.</li>
            <li>You assume all risks associated with meeting, exchanging items, and interacting with other users. Corcles does not conduct background checks or verify identities.</li>
            <li>Corcles does not process payments and does not act as an escrow or intermediary for financial transactions.</li>
            <li>You release Corcles and its affiliates from any liability related to items, communications, or transactions on the Platform.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">3. Prohibited Items & Activities</h2>
          <p>You may not list, request, or exchange:</p>
          <ul className="list-none pl-6 space-y-1">
            <li>❌ Illegal items (drugs, weapons, counterfeit goods, stolen property)</li>
            <li>❌ Services or non-physical goods (except as explicitly allowed by Corcles)</li>
            <li>❌ Monetary payments or financial transactions (no buying or selling with money)</li>
            <li>❌ Anything hazardous (chemicals, recalled items, unsafe electronics)</li>
            <li>❌ Alcohol, tobacco, or controlled substances</li>
          </ul>
          <p>Corcles reserves the right to remove listings and suspend accounts that violate these guidelines.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">4. Safety Guidelines</h2>
          <p>For your protection, we recommend:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Meeting in public places when exchanging items.</li>
            <li>Bringing a friend if meeting someone in person.</li>
            <li>Inspecting items before accepting them.</li>
            <li>Avoiding sharing personal or financial information with other users.</li>
          </ul>
          <p>Corcles does not provide insurance or guarantees for any items or transactions.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">5. User Conduct & Karma System</h2>
          <p>By using Corcles, you agree to:</p>
          <ul className="list-none pl-6 space-y-1">
            <li>✅ Be honest and respectful in listings, requests, and communications.</li>
            <li>✅ Honor commitments when offering or requesting items.</li>
            <li>✅ Follow local laws and regulations when using the Platform.</li>
          </ul>
          <p>Violating these Terms may result in karma deductions, temporary suspensions, or permanent bans from Corcles.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">6. Account Termination & Moderation</h2>
          <p>Corcles reserves the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Remove any listing that violates these Terms or community guidelines.</li>
            <li>Suspend or terminate any account engaged in misconduct, fraud, or harassment.</li>
            <li>Modify or discontinue features of the Platform at any time without liability.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">7. No Warranties & Limitation of Liability</h2>
          <p>Corcles is provided "as is" and "as available," with no guarantees of uptime, reliability, or accuracy. To the fullest extent permitted by law:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Corcles disclaims all warranties, express or implied, including merchantability or fitness for a particular purpose.</li>
            <li>Corcles is not liable for any direct, indirect, incidental, or consequential damages arising from the use of the Platform.</li>
            <li>If any dispute arises, your sole remedy is to stop using the Platform.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">8. Governing Law & Dispute Resolution</h2>
          <p>These Terms are governed by the laws of California. Any disputes must be resolved through binding arbitration in San Francisco, with no class-action lawsuits permitted.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">9. Changes to These Terms</h2>
          <p>Corcles may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">10. Contact Information</h2>
          <p>For questions or concerns, contact us at: support@corcles.com</p>
        </section>

        <p className="pt-4">Thank you for being part of Corcles!</p>
      </div>
    </ScrollArea>
  );
}
