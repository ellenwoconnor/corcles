import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchControlsProps {
  onSearchChange: (search: string) => void;
  onFreeOnlyChange: (freeOnly: boolean) => void;
}

export function SearchControls({ onSearchChange, onFreeOnlyChange }: SearchControlsProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  return (
    <div className="space-y-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="free-only"
          onCheckedChange={onFreeOnlyChange}
        />
        <Label htmlFor="free-only">Show free items only</Label>
      </div>
    </div>
  );
}
