
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AddressCompletionDialogProps {
  open: boolean;
  onComplete: (address: string, zipCode: string) => void;
  email: string;
}

export function AddressCompletionDialog({ 
  open, 
  onComplete,
  email
}: AddressCompletionDialogProps) {
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    
    // Check if zip code is exactly 5 digits
    if (!/^\d{5}$/.test(zipCode)) {
      setError('Zip code must be exactly 5 digits');
      return;
    }
    
    // If validation passes, call the onComplete function
    onComplete(address, zipCode);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide your address to complete your account setup.
            We use this information to place you in your local community.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip Code</Label>
            <Input
              id="zipCode"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="12345"
              maxLength={5}
              pattern="[0-9]{5}"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Complete Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
