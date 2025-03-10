
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Community } from "@shared/schema";

interface CommunityInviteFormProps {
  community: Community;
  onSuccess?: () => void;
}

const inviteSchema = z.object({
  invitedEmail: z.string().email("Please enter a valid email address"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export function CommunityInviteForm({ community, onSuccess }: CommunityInviteFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      invitedEmail: "",
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ invitedEmail }: InviteFormValues) => {
      const response = await apiRequest("POST", `/api/communities/${community.id}/invite`, { invitedEmail });
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
      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InviteFormValues) => {
    inviteMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="invitedEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="Enter email address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Send Invitation
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default CommunityInviteForm;
