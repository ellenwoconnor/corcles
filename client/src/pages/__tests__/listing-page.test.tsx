import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the icon components
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader2" />,
  MessageSquare: () => <div data-testid="message-square" />,
  Pencil: () => <div data-testid="pencil" />,
  User: () => <div data-testid="user" />,
  LogOut: () => <div data-testid="logout" />,
  Settings: () => <div data-testid="settings" />,
  Search: () => <div data-testid="search" />,
  Bell: () => <div data-testid="bell" />,
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

// Mock wouter's components and hooks
const mockParams = { id: '1' };
vi.mock('wouter', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useRoute: () => [true, mockParams],
  useLocation: () => ['/listing/1'],
  // Add Router component that renders its children
  Router: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingPage from '../listing-page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Router } from 'wouter';

const mockItem = {
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

const renderWithQuery = (itemId: string, item = mockItem) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  // Set the query data before rendering
  queryClient.setQueryData(['/api/items', itemId], item);

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

  it('shows loading state initially', () => {
    renderWithQuery('1');
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
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
    // Mock authenticated user as owner
    (useAuth as any).mockReturnValue({
      user: { id: mockItem.userId, community: 'test-community' },
      isAuthenticated: true,
    });

    renderWithQuery('1');

    await waitFor(() => {
      expect(screen.getByText('Edit Listing')).toBeInTheDocument();
    });

    // Mock different user
    (useAuth as any).mockReturnValue({
      user: { id: 999, community: 'test-community' },
      isAuthenticated: true,
    });

    renderWithQuery('1');

    await waitFor(() => {
      expect(screen.queryByText('Edit Listing')).not.toBeInTheDocument();
    });
  });

  it('displays "Free" badge for gift items', async () => {
    const giftItem = { ...mockItem, isGift: true, price: null };
    renderWithQuery('1', giftItem);

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });
  });

  it('shows bid form for non-gift items', async () => {
    renderWithQuery('1');

    await waitFor(() => {
      expect(screen.getByText('Place Bid')).toBeInTheDocument();
      expect(screen.queryByText('Request Item')).not.toBeInTheDocument();
    });
  });

  it('shows request form for gift items', async () => {
    const giftItem = { ...mockItem, isGift: true, price: null };
    renderWithQuery('1', giftItem);

    await waitFor(() => {
      expect(screen.getByText('Request Item')).toBeInTheDocument();
      expect(screen.queryByText('Place Bid')).not.toBeInTheDocument();
    });
  });
});