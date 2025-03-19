import { HeartHandshake } from "lucide-react";

export default function EmptyMarketplace() {
  return (
    <div className="flex flex-col items-center justify-center w-[32rem] h-[32rem] bg-gray-100 rounded-md">
      <div className="w-32 h-32 mb-8">
        <HeartHandshake className="w-full h-full text-muted-foreground" />
      </div>
      <h3 className="text-2xl text-center mb-2 text-muted-foreground">
        Sharing starts here
      </h3>
      <p className="text-muted-foreground text-center">
        Break the ice with the community's first listing
      </p>
    </div>
  );
}
