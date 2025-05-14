import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseMutationResult } from "@tanstack/react-query";

// Define the form schema
const inviteSchema = z.object({
  invitedEmail: z.string().email("Please enter a valid email address"),
  message: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface EmailInviteDialogProps {
  communityName: string;
  isCustomCommunity: boolean;
  sendInvite: UseMutationResult<
    any,
    Error,
    { invitedEmail: string; message?: string }
  >;
}

export function EmailInviteDialog({
  communityName,
  isCustomCommunity,
  sendInvite,
}: EmailInviteDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      invitedEmail: "",
      message: "",
    },
  });

  const onSubmit = (data: InviteFormValues) => {
    sendInvite.mutate(data, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="h-4 w-4" />
          <span>Email Invite</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite to {communityName}</DialogTitle>
          <DialogDescription>
            Send an email invitation to join this community
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mt-2 mb-4 text-sm">
          {isCustomCommunity ? (
            <p>
              Your friend will receive an email with instructions on how to join this
              custom community.
            </p>
          ) : (
            <>
              <p className="mb-2">
                Neighbors with matching zip codes can join this community. They'll
                receive an email with setup instructions.
              </p>
              <p className="text-amber-600 dark:text-amber-500 flex items-center text-xs">
                <span className="mr-1">⚠️</span> This community is limited to
                addresses in your zip code area.
              </p>
            </>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="invitedEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter email address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add a personal message to your invitation..."
                      className="resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendInvite.isPending}
              >
                {sendInvite.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default EmailInviteDialog;