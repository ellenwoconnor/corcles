import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
// ... other imports

interface Item {
  id: string;
  // ... other properties
}

export default function ItemPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const showMessages = searchParams.get('showMessages') === 'true';
  const requestId = searchParams.get('requestId');
  const [messageDialogOpen, setMessageDialogOpen] = useState(showMessages);
  const { data: item, isLoading } = useQuery<Item>({
    queryKey: ['item', id],
    queryFn: () => {
      // ... fetch item data
    },
    enabled: !!id, // Only fetch when id is available
  });

  // ... rest of the component code
  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!item) {
    return <p>Item not found</p>;
  }

  return (
    <>
      {/* ... other elements */}
      <MessageDialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} requestId={requestId} />
      {/* ... other elements */}
    </>
  );
}


// Dummy MessageDialog component for compilation
function MessageDialog({ open, onClose, requestId }: { open: boolean; onClose: () => void; requestId: string | null }) {
  if (!open) return null;
  return (
    <div>
      <h1>Message Dialog</h1>
      <p>Request ID: {requestId}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}