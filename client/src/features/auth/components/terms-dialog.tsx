
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import TermsOfService from "@/components/terms-of-service";

export default function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger className="text-primary hover:underline">
        Terms of Service
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh]">
        <TermsOfService />
      </DialogContent>
    </Dialog>
  );
}
