import type { UseWalletReturn } from "@/lib/hooks/useWallet";

export type WalletCTAStatus =
  | "not-installed"
  | "not-connected"
  | "not-ready"
  | "ready"
  | "loading";

export interface WalletCTAState {
  status: WalletCTAStatus;
  disabled: boolean;
  guidance: string | null;
}

export type WalletCTAInput = Pick<
  UseWalletReturn,
  "isFreighterInstalled" | "isConnected" | "isReady" | "readinessError" | "isLoading"
>;

export function getWalletCTAState(
  wallet: WalletCTAInput,
  opts?: { extraDisabled?: boolean },
): WalletCTAState {
  if (wallet.isLoading) {
    return { status: "loading", disabled: true, guidance: null };
  }

  if (!wallet.isFreighterInstalled) {
    return {
      status: "not-installed",
      disabled: true,
      guidance: "Install Freighter wallet to continue.",
    };
  }

  if (!wallet.isConnected) {
    return { status: "not-connected", disabled: false, guidance: null };
  }

  if (!wallet.isReady) {
    return {
      status: "not-ready",
      disabled: true,
      guidance: wallet.readinessError || "Wallet not ready.",
    };
  }

  return {
    status: "ready",
    disabled: opts?.extraDisabled ?? false,
    guidance: null,
  };
}
