import { Badge } from "@/components/ui/badge";
import { cva } from "class-variance-authority";

interface InviteStatusBadgeProps {
  status: string;
}

// Create custom badge variants
const badgeVariants = cva("", {
  variants: {
    status: {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
      accepted: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
      default: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    }
  },
  defaultVariants: {
    status: "default"
  }
});

export function InviteStatusBadge({ status }: InviteStatusBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`capitalize ${badgeVariants({ status: status as "pending" | "accepted" | "rejected" | "default" })}`}
    >
      {status}
    </Badge>
  );
}