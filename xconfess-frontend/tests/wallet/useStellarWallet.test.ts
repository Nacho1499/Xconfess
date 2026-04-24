/**
 * useStellarWallet.test.ts
 * Issue #194 – Guard anchor path + not-ready wallet path
 * Issue #196 – Mismatch detection
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";

// ── Freighter mock ────────────────────────────────────────────────────────────
const mockFreighter = {
  isConnected: jest.fn(),
  requestAccess: jest.fn(),
  getPublicKey: jest.fn(),
  getNetworkDetails: jest.fn(),
  signTransaction: jest.fn(),
};

jest.mock("@stellar/freighter-api", () => mockFreighter, { virtual: true });

// Dynamic import used inside the hook needs the mock above ↑

beforeEach(() => jest.clearAllMocks());

// ── #194 – successful anchor path ─────────────────────────────────────────────
describe("useStellarWallet – successful anchor path", () => {
  it("connects and signs XDR when wallet and network are ready", async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue("GABC...TEST");
    mockFreighter.getNetworkDetails.mockResolvedValue({
      networkPassphrase: "Test SDF Network ; September 2015",
    });
    mockFreighter.signTransaction.mockResolvedValue({
      signedXDR: "signed-xdr-value",
    });

    const { result } = renderHook(() => useStellarWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.networkMismatch).toBe(false);

    let signedXdr: string | undefined;
    await act(async () => {
      signedXdr = await result.current.signAndSubmitAnchorTx("raw-xdr");
    });

    expect(signedXdr).toBe("signed-xdr-value");
    expect(mockFreighter.signTransaction).toHaveBeenCalledWith(
      "raw-xdr",
      expect.any(Object),
    );
  });
});

// ── #194 – not-ready wallet path ──────────────────────────────────────────────
describe("useStellarWallet – not-ready wallet path", () => {
  it("throws if signAndSubmitAnchorTx is called before connect", async () => {
    const { result } = renderHook(() => useStellarWallet());

    await expect(
      result.current.signAndSubmitAnchorTx("raw-xdr"),
    ).rejects.toThrow("Wallet is not connected.");
  });
});

// ── #196 – network mismatch ───────────────────────────────────────────────────
describe("useStellarWallet – network mismatch", () => {
  it("sets networkMismatch=true and an actionable error when wallet network differs", async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue("GABC...TEST");
    mockFreighter.getNetworkDetails.mockResolvedValue({
      // Mainnet passphrase while app expects testnet
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });

    const { result } = renderHook(() => useStellarWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.networkMismatch).toBe(true);
    expect(result.current.error).toMatch(/switch networks/i);
  });

  it("throws on signAndSubmitAnchorTx when networkMismatch is true", async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue("GABC...TEST");
    mockFreighter.getNetworkDetails.mockResolvedValue({
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });

    const { result } = renderHook(() => useStellarWallet());

    await act(async () => {
      await result.current.connect();
    });

    await expect(
      result.current.signAndSubmitAnchorTx("raw-xdr"),
    ).rejects.toThrow(/Network mismatch/i);
  });
});
