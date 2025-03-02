
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
}

export function ImageUpload({ value, onChange, onFileChange }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);

    if (file) {
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          className="flex-1"
        />
        {preview && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              onChange("");
              setPreview(null);
              onFileChange(null);
            }}
            size="sm"
          >
            Remove
          </Button>
        )}
      </div>
      
      {preview && (
        <div className="relative aspect-video overflow-hidden rounded-md border">
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      
      {!preview && value && (
        <div className="relative aspect-video overflow-hidden rounded-md border">
          <img
            src={value}
            alt="Uploaded image"
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
