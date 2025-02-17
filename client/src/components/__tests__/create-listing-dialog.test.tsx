
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
      <CreateListingDialog />
    </QueryClientProvider>
  );
};

describe('CreateListingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: 1, community: 'test-community' },
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
  });

  it('defaults to gift/free mode', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);
    
    const freeButton = screen.getByRole('button', { name: /free/i });
    expect(freeButton).toHaveClass('bg-primary');
    expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
  });

  it('shows price input when "Set a price" is selected', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);
    
    const setPriceButton = screen.getByRole('button', { name: /set a price/i });
    await userEvent.click(setPriceButton);
    
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);
    
    const submitButton = screen.getByRole('button', { name: /^create listing$/i });
    await userEvent.click(submitButton);
    
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/description is required/i)).toBeInTheDocument();
  });

  it('validates price when not in gift mode', async () => {
    renderWithQuery();
    const createButton = screen.getByRole('button', { name: /create listing/i });
    await userEvent.click(createButton);
    
    const setPriceButton = screen.getByRole('button', { name: /set a price/i });
    await userEvent.click(setPriceButton);
    
    const priceInput = screen.getByLabelText(/price/i);
    await userEvent.type(priceInput, '0');
    
    const submitButton = screen.getByRole('button', { name: /^create listing$/i });
    await userEvent.click(submitButton);
    
    expect(await screen.findByText(/price must be greater than zero/i)).toBeInTheDocument();
  });
});
