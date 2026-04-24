/**
 * ActivityPanel.test.tsx
 * Issue #199 – State convergence after delayed backend updates
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import * as tippingService from "@/lib/services/tipping.service";
import { useActivityStore } from "@/store/activityStore";
import ActivityPanel from "@/app/components/activity/ActivityPanel";

jest.mock("@/lib/services/tipping.service");
jest.useFakeTimers();

beforeEach(() => {
  useActivityStore.setState({ items: [] });
  jest.clearAllMocks();
});

afterEach(() => jest.clearAllTimers());

describe("ActivityPanel – canonical state convergence", () => {
  it("shows optimistic pending then updates to backend-confirmed status", async () => {
    // Seed optimistic item
    act(() => {
      useActivityStore.getState().addOptimistic({
        id: "tip-1",
        type: "tip",
        confessionId: "conf-1",
        localStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    (tippingService.fetchTipStatus as jest.Mock).mockResolvedValue({
      tipId: "tip-1",
      status: "confirmed",
    });

    render(<ActivityPanel />);

    // Initially shows local optimistic
    expect(screen.getByText(/pending/i)).toBeInTheDocument();

    // Trigger first reconciliation poll
    await act(async () => {
      await useActivityStore.getState().reconcilePending();
    });

    await waitFor(() => {
      expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
    });
  });

  it("shows stale_pending copy for items that remain unconfirmed", async () => {
    act(() => {
      useActivityStore.getState().addOptimistic({
        id: "tip-2",
        type: "tip",
        confessionId: "conf-2",
        localStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    (tippingService.fetchTipStatus as jest.Mock).mockResolvedValue({
      tipId: "tip-2",
      status: "stale_pending",
    });

    render(<ActivityPanel />);

    await act(async () => {
      await useActivityStore.getState().reconcilePending();
    });

    await waitFor(() => {
      expect(screen.getByText(/awaiting confirmation/i)).toBeInTheDocument();
    });
  });

  it("distinguishes failed from pending", async () => {
    act(() => {
      useActivityStore.getState().addOptimistic({
        id: "tip-3",
        type: "tip",
        confessionId: "conf-3",
        localStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    (tippingService.fetchTipStatus as jest.Mock).mockResolvedValue({
      tipId: "tip-3",
      status: "failed",
    });

    render(<ActivityPanel />);

    await act(async () => {
      await useActivityStore.getState().reconcilePending();
    });

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });
});
