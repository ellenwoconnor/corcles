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

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingPage from '../listing-page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Router } from 'wouter';

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
        staleTime: Infinity,
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
          cacheTime: 0,
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

    // Test should find the loading indicator since we're not pre-seeding the cache
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

    const { rerender, unmount } = renderWithQuery('1');

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
    }, { timeout: 2000 });
  });

  it('displays "Free" badge for gift items', async () => {
    const giftItem: MockItem = { ...mockItem, isGift: true, price: null };
    renderWithQuery('1', giftItem);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  it('shows bid form for non-gift items', async () => {
    renderWithQuery('1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /place bid/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /request item/i })).not.toBeInTheDocument();
    });
  });

  it('shows request form for gift items', async () => {
    const giftItem: MockItem = { ...mockItem, isGift: true, price: null };
    renderWithQuery('1', giftItem);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request item/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /place bid/i })).not.toBeInTheDocument();
    });
  });
});