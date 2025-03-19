import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { type Community } from "@shared/schema";
import { useState } from "react";

interface WelcomeDialogProps {
  communities: (Community & { role: string })[];
}

export function WelcomeDialog({ communities }: WelcomeDialogProps) {
  const [open, setOpen] = useState(true);

  const homeZipCommunity = communities.find((c) => !c.isCustom);
  const invitedCommunities = communities.filter((c) => c.isCustom);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Corcles!</DialogTitle>
          <DialogDescription className="text-base space-y-4 pt-4">
            <p>
              Say goodbye to waste -- Corcles is a smarter way to share and shop
              sustainably in your neighborhood.
            </p>

            {homeZipCommunity && (
              <div>
                <p>
                  You've been added to your home corcle, {homeZipCommunity.name}
                  . You can give and receive items in your corcles.
                </p>
              </div>
            )}

            {invitedCommunities.length > 0 && (
              <div>
                <p className="font-medium text-foreground">
                  Welcome to the party!
                </p>
                <p>
                  You've also been invited into private corcles:{" "}
                  {invitedCommunities.join(", ")}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={() => {
            localStorage.setItem('hasSeenWelcome', 'true');
            setOpen(false);
          }}>Get Started</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
