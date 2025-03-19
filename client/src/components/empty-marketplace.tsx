
import { FolderOpen } from "lucide-react";

export default function EmptyMarketplace() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-24 h-24 mb-6">
        <FolderOpen className="w-full h-full text-gray-300" />
      </div>
      <h3 className="text-2xl font-semibold text-center mb-2">
        Sharing starts here
      </h3>
      <p className="text-muted-foreground text-center">
        Break the ice with the community's first listing
      </p>
    </div>
  );
}
