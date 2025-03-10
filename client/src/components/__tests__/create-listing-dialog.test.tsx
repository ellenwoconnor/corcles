import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateListingDialog from '../create-listing-dialog';
import { useAuth } from '@/features/auth/hooks/use-auth';

// Mock icons
vi.mock('lucide-react', async () => {
  const mockIcon = () => <div data-testid="icon" />;
  return {
    Gift: mockIcon,
    DollarSign: mockIcon,
    Loader2: mockIcon,
  };
});

// Mock the auth hook
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

// Mock API request
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

const mockCommunities = [
  { 
    id: 1, 
    name: 'Test Community 1', 
    role: 'member', 
    memberCount: 5,
    createdAt: new Date(),
    description: 'Test description 1',
    createdBy: 1,
    isCustom: true
  },
  { 
    id: 2, 
    name: 'Test Community 2', 
    role: 'member', 
    memberCount: 3,
    createdAt: new Date(),
    description: 'Test description 2',
    createdBy: 1,
    isCustom: true
  },
];

const renderWithQuery = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CreateListingDialog communities={mockCommunities} />
    </QueryClientProvider>
  );
};

describe('CreateListingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 1 },
      isAuthenticated: true,
    });
  });

  it('renders create listing button', () => {
    renderWithQuery();
    expect(screen.getByRole('button', { name: /create listing/i })).toBeInTheDocument();
  });

  it('opens dialog when create button is clicked', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/community/i)).toBeInTheDocument();
  });

  it('defaults to gift/free mode', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);

    const freeButton = screen.getByLabelText(/free item/i);
    expect(freeButton).toBeChecked();
    expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);

    const submitButton = screen.getByRole('button', { name: /^create listing$/i });
    await userEvent.click(submitButton);

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/please select a community/i)).toBeInTheDocument();
  });

  it('validates price when not in gift mode', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);

    // Uncheck gift mode
    const freeButton = screen.getByLabelText(/free item/i);
    await userEvent.click(freeButton);

    const priceInput = screen.getByLabelText(/price/i);
    await userEvent.type(priceInput, '0');

    const submitButton = screen.getByRole('button', { name: /^create listing$/i });
    await userEvent.click(submitButton);

    expect(await screen.findByText(/price must be greater than zero/i)).toBeInTheDocument();
  });

  it('shows community selection dropdown', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);

    expect(screen.getByText(/select a community/i)).toBeInTheDocument();
    const communitySelect = screen.getByLabelText(/community/i);
    expect(communitySelect).toBeInTheDocument();
  });
});