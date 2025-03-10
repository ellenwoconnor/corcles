
import React, { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface PickupLocationInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PickupLocationInput({ value, onChange }: PickupLocationInputProps) {
  const { user } = useAuth();
  const [useUserAddress, setUseUserAddress] = useState(!value || value === user?.address);
  
  // When the component loads, if no value is provided, use the user's address
  React.useEffect(() => {
    if (useUserAddress && user?.address) {
      onChange(user.address);
    }
  }, [useUserAddress, user?.address]);

  const handleToggleChange = (checked: boolean) => {
    setUseUserAddress(checked);
    if (checked && user?.address) {
      onChange(user.address);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="use-address" 
          checked={useUserAddress} 
          onCheckedChange={handleToggleChange}
        />
        <Label htmlFor="use-address">Use my address as pickup location</Label>
      </div>
      
      {!useUserAddress && (
        <div className="space-y-2">
          <Label htmlFor="custom-pickup-location">Specify pickup location</Label>
          <Input
            id="custom-pickup-location"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter pickup location"
          />
        </div>
      )}
    </div>
  );
}
