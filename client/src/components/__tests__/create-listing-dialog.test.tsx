import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import PickupConfirmation from "../pickup-confirmation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockItem = {
  id: 1,
  title: "Test Item",
  description: "Test Description",
  pickupStart: new Date().toISOString(),
  pickupEnd: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
};

const mockRequest = {
  id: 1,
  itemId: 1,
  requesterId: 2,
  status: "pending",
  createdAt: new Date().toISOString(),
};

describe("PickupConfirmation", () => {
  it("should display pickup window details", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PickupConfirmation item={mockItem} request={mockRequest} />
      </QueryClientProvider>
    );

    expect(screen.getByText("Pickup Confirmation Required")).toBeInTheDocument();
    expect(screen.getByText(/Proposed Pickup Window/)).toBeInTheDocument();
  });

  it("should allow confirming pickup time", async () => {
    const user = userEvent.setup();
    
    // Mock fetch for API request
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <PickupConfirmation item={mockItem} request={mockRequest} />
      </QueryClientProvider>
    );

    await user.click(screen.getByText("Confirm Pickup Time"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/items/${mockItem.id}/confirm-pickup`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ confirmed: true }),
        })
      );
    });
  });

  it("should allow declining pickup time", async () => {
    const user = userEvent.setup();
    
    // Mock fetch for API request
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <PickupConfirmation item={mockItem} request={mockRequest} />
      </QueryClientProvider>
    );

    await user.click(screen.getByText("Decline"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/items/${mockItem.id}/confirm-pickup`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ confirmed: false }),
        })
      );
    });
  });

  it("should handle API errors gracefully", async () => {
    const user = userEvent.setup();
    
    // Mock fetch to simulate an error
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: "Failed to confirm pickup" }),
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <PickupConfirmation item={mockItem} request={mockRequest} />
      </QueryClientProvider>
    );

    await user.click(screen.getByText("Confirm Pickup Time"));

    await waitFor(() => {
      expect(screen.getByText("Failed to confirm pickup")).toBeInTheDocument();
    });
  });
});
