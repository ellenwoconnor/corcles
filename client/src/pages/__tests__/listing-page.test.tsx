import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock all required icons with async importOriginal
vi.mock('lucide-react', async () => {
  const mockIcon = () => <div data-testid="icon" />;
  return {
    Loader2: () => <div data-testid="loader2" />,
    MessageSquare: mockIcon,
    Pencil: mockIcon,
    User: mockIcon,
    LogOut: mockIcon,
    Settings: mockIcon,
    Search: mockIcon,
    Bell: mockIcon,
    X: mockIcon,
    Heart: mockIcon,
    Calendar: mockIcon,
    Clock: mockIcon,
    Check: mockIcon,
  };
});

// Mock wouter's components and hooks
const mockParams = { id: '1' };
vi.mock('wouter', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useRoute: () => [true, mockParams],
  useLocation: () => ['/listing/1'],
  Router: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the auth hook
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock the API request function
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  },
}));

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingPage from '../listing-page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Router } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface MockItem {
  id: number;
  title: string;
  description: string;
  price: number | null;
  isGift: boolean;
  imageUrl: string;
  community: string;
  userId: number;
  createdAt: string;
  status: string;
  favorites: number;
  userDisplayName: string;
  userHasFavorited: boolean;
  recipientId?: number | null;
  pickupStart?: string | null;
  pickupEnd?: string | null;
}

const mockItem: MockItem = {
  id: 1,
  title: 'Test Item',
  description: 'Test Description',
  price: 100,
  isGift: false,
  imageUrl: 'test.jpg',
  community: 'test-community',
  userId: 1,
  createdAt: new Date().toISOString(),
  status: 'available',
  favorites: 0,
  userDisplayName: 'testUser',
  userHasFavorited: false,
};

const renderWithQuery = (itemId: string, item: MockItem = mockItem) => {
  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  // Set the query data before rendering
  queryClient.setQueryData([`/api/items/${itemId}`], item);

  return render(
    <QueryClientProvider client={queryClient}>
      <Router>
        <ListingPage />
      </Router>
    </QueryClientProvider>
  );
};

describe('ListingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default auth mock
    (useAuth as any).mockReturnValue({
      user: { id: 999, community: 'test-community' },
      isAuthenticated: true,
    });
  });

  it('shows loading state initially', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <ListingPage />
        </Router>
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('loader2')).toBeInTheDocument();
  });

  it('displays item details when loaded', async () => {
    renderWithQuery('1');

    await waitFor(() => {
      expect(screen.getByText(mockItem.title)).toBeInTheDocument();
      expect(screen.getByText(`$${mockItem.price}`)).toBeInTheDocument();
      expect(screen.getByText(mockItem.description)).toBeInTheDocument();
    });
  });

  it('shows edit button only for item owner', async () => {
    // First render with owner permissions
    (useAuth as any).mockReturnValue({
      user: { id: mockItem.userId, community: 'test-community' },
      isAuthenticated: true,
    });

    const { unmount } = renderWithQuery('1');

    await waitFor(() => {
      const editButton = screen.getByRole('button', { name: /edit listing/i });
      expect(editButton).toBeInTheDocument();
    });

    // Cleanup and re-render with different user
    unmount();

    (useAuth as any).mockReturnValue({
      user: { id: 999, community: 'test-community' },
      isAuthenticated: true,
    });

    renderWithQuery('1');

    await waitFor(() => {
      const editButton = screen.queryByRole('button', { name: /edit listing/i });
      expect(editButton).not.toBeInTheDocument();
    });
  });

  it('displays "Free" badge for gift items', async () => {
    const giftItem: MockItem = { ...mockItem, isGift: true, price: null };
    renderWithQuery('1', giftItem);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  // New test for pickup confirmation as recipient
  it('shows pickup confirmation UI and handles confirmation', async () => {
    const recipientId = 999;
    (useAuth as any).mockReturnValue({
      user: { id: recipientId, community: 'test-community' },
      isAuthenticated: true,
    });

    const pickupStart = new Date();
    const pickupEnd = new Date(pickupStart.getTime() + 3600000); // 1 hour later

    const giftItem: MockItem = {
      ...mockItem,
      isGift: true,
      price: null,
      status: 'pending_pickup',
      recipientId,
      pickupStart: pickupStart.toISOString(),
      pickupEnd: pickupEnd.toISOString(),
    };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    // Set up both the item and request data
    queryClient.setQueryData(['/api/items/1'], giftItem);
    queryClient.setQueryData(['/api/items/1/my-requests'], [
      {
        id: 1,
        itemId: 1,
        requesterId: recipientId,
        status: 'awaiting_pickup_confirmation',
        message: 'Test request',
      },
    ]);

    (apiRequest as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <ListingPage />
        </Router>
      </QueryClientProvider>
    );

    // Alert should be visible
    await waitFor(() => {
      expect(screen.getByText(/pickup confirmation pending/i)).toBeInTheDocument();
    });

    // Confirmation buttons should be present
    const confirmButton = screen.getByRole('button', { name: /confirm pickup/i });
    const declineButton = screen.getByRole('button', { name: /decline/i });

    expect(confirmButton).toBeInTheDocument();
    expect(declineButton).toBeInTheDocument();

    // Test confirmation flow
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/items/1/confirm-pickup',
        { confirmed: true }
      );
    });
  });

  // New test for owner pickup scheduling
  it('shows pickup scheduler for item owner and handles scheduling', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: mockItem.userId, community: 'test-community' },
      isAuthenticated: true,
    });

    const giftItem: MockItem = {
      ...mockItem,
      isGift: true,
      price: null,
      status: 'pending_pickup',
    };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    queryClient.setQueryData(['/api/items/1'], giftItem);
    queryClient.setQueryData(['/api/items/1/requests'], [
      { id: 1, status: 'ready_for_drawing', message: 'Test request' },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <ListingPage />
        </Router>
      </QueryClientProvider>
    );

    // Schedule pickup button should be visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /schedule pickup/i })).toBeInTheDocument();
    });
  });

  // New test for pickup window display
  it('displays pickup window correctly when scheduled', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: mockItem.userId, community: 'test-community' },
      isAuthenticated: true,
    });

    const pickupStart = new Date();
    const pickupEnd = new Date(pickupStart.getTime() + 3600000);

    const giftItem: MockItem = {
      ...mockItem,
      isGift: true,
      price: null,
      status: 'pending_pickup',
      pickupStart: pickupStart.toISOString(),
      pickupEnd: pickupEnd.toISOString(),
    };

    renderWithQuery('1', giftItem);

    await waitFor(() => {
      // Should show formatted pickup window time
      expect(screen.getByText(new RegExp(pickupStart.toLocaleDateString()))).toBeInTheDocument();
    });
  });
});