import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { type Community } from "@shared/schema";
import { useState } from "react";

interface WelcomeDialogProps {
  communities: (Community & { role: string })[];
}

export function WelcomeDialog({ communities }: WelcomeDialogProps) {
  const [open, setOpen] = useState(true);

  const homeZipCommunity = communities.find(c => !c.isCustom);
  const invitedCommunities = communities.filter(c => c.isCustom);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Corcles! 🎉</DialogTitle>
          <DialogDescription className="text-base space-y-4 pt-4">
            <p>
              Corcles is your neighborhood's digital marketplace, where you can share, 
              exchange, and discover items within your local community. It's a space 
              designed to promote sustainable living and strengthen community bonds.
            </p>

            {homeZipCommunity && (
              <div>
                <p className="font-medium text-foreground">Your Local Community</p>
                <p>
                  You've been automatically added to {homeZipCommunity.name}, 
                  your local community based on your zip code.
                </p>
              </div>
            )}

            {invitedCommunities.length > 0 && (
              <div>
                <p className="font-medium text-foreground">Additional Communities</p>
                <p>
                  You've also been added to the following communities:
                </p>
                <ul className="list-disc pl-6 mt-2">
                  {invitedCommunities.map(community => (
                    <li key={community.id}>{community.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <p>
              Ready to get started? Browse available items in your communities, 
              or list something you'd like to share!
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
