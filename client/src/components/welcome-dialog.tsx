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
          <DialogTitle className="text-2xl py-4">
            Welcome to <span className="uppercase tracking-wide">C<span className="text-[#B2B8A3]">O</span>RCLES</span>!
          </DialogTitle>
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
              <div className="py-6">
                <p className="font-medium text-foreground">
                  Even more to enjoy
                </p>
                <p>
                  You've also been invited into private corcles:{" "}
                  {invitedCommunities
                    .map((community) => community.name)
                    .join(", ")}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            onClick={() => {
              localStorage.setItem("hasSeenWelcome", "true");
              setOpen(false);
            }}
          >
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
