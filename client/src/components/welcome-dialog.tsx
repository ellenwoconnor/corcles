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
import { useLocation } from "wouter";
import { Gift, FileSearch, UserPlus } from "lucide-react";

interface WelcomeDialogProps {
  communities: (Community & { role: string })[];
}

export function WelcomeDialog({ communities }: WelcomeDialogProps) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();

  const homeZipCommunity = communities.find((c) => !c.isCustom);
  const invitedCommunities = communities.filter((c) => c.isCustom);

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      setOpen(false);
      setLocation("/home");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 1 && "Welcome to Corcles!"}
            {step === 2 && "Your Communities"}
            {step === 3 && "Ready to Start"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <DialogDescription className="text-base">
                Welcome to a smarter way to share and shop sustainably in your
                neighborhood. Here's what you can do:
              </DialogDescription>
              <div className="grid gap-4">
                <div className="flex items-start gap-4">
                  <Gift className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-medium">Share Items</h4>
                    <p className="text-muted-foreground">
                      List items you want to give away or sell within your community
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FileSearch className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-medium">Find What You Need</h4>
                    <p className="text-muted-foreground">
                      Browse items or create wishlists for things you're looking for
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <UserPlus className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-medium">Build Community</h4>
                    <p className="text-muted-foreground">
                      Connect with neighbors and create custom communities
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {homeZipCommunity && (
                <div>
                  <h4 className="font-medium mb-2">Your Home Community</h4>
                  <p className="text-muted-foreground">
                    You've been added to {homeZipCommunity.name}. This is where
                    you can share and receive items with nearby neighbors.
                  </p>
                </div>
              )}

              {invitedCommunities.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Additional Communities</h4>
                  <p className="text-muted-foreground mb-2">
                    You're also part of these communities:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    {invitedCommunities.map((community) => (
                      <li key={community.id}>{community.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <DialogDescription className="text-base">
                You're all set! Here are some ways to get started:
              </DialogDescription>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setOpen(false);
                    setLocation("/home");
                  }}
                >
                  Browse available items
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setOpen(false);
                    setLocation("/wishlists");
                  }}
                >
                  Create a wishlist
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setOpen(false);
                    setLocation("/communities");
                  }}
                >
                  Manage your communities
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </div>
            <Button onClick={handleNext}>
              {step === totalSteps ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}