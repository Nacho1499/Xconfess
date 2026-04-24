/**
 * AnchorButton.tsx
 * Issue #196 – Block anchor submission on network mismatch with actionable copy
 * Issue #198 – Prevent duplicate tip/anchor verification submits
 */

"use client";

import React, { useCallback, useRef, useState } from "react";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";

interface AnchorButtonProps {
  confessionId: string;
  anchorXdr: string;
  onSuccess?: (signedXdr: string) => void;
  onError?: (err: Error) => void;
}

type SubmitState = "idle" | "pending" | "success" | "error";

export function AnchorButton({
  confessionId,
  anchorXdr,
  onSuccess,
  onError,
}: AnchorButtonProps) {
  const wallet = useStellarWallet();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Issue #198 – guard against duplicate in-flight submits
  const inFlightRef = useRef(false);

  const handleAnchor = useCallback(async () => {
    if (inFlightRef.current || submitState === "pending") return;

    inFlightRef.current = true;
    setSubmitState("pending");
    setErrorMsg(null);

    try {
      const signedXdr = await wallet.signAndSubmitAnchorTx(anchorXdr);
      setSubmitState("success");
      onSuccess?.(signedXdr);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setSubmitState("error");
      setErrorMsg(e.message);
      onError?.(e);
    } finally {
      inFlightRef.current = false;
    }
  }, [anchorXdr, onError, onSuccess, submitState, wallet]);

  // Issue #196 – network mismatch: disable CTA + show actionable guidance
  if (!wallet.isConnected) {
    return (
      <button
        type="button"
        onClick={wallet.connect}
        disabled={wallet.isConnecting}
        className="anchor-btn anchor-btn--connect"
      >
        {wallet.isConnecting ? "Connecting…" : "Connect Wallet to Anchor"}
      </button>
    );
  }

  if (wallet.networkMismatch) {
    return (
      <div className="anchor-mismatch" role="alert">
        <p className="anchor-mismatch__message">
          Your wallet is on <strong>{wallet.network}</strong> but this app uses{" "}
          <strong>
            {process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"}
          </strong>
          . Please switch networks in Freighter before anchoring.
        </p>
        <button
          type="button"
          className="anchor-btn anchor-btn--disabled"
          disabled
        >
          Anchor Confession
        </button>
      </div>
    );
  }

  return (
    <div className="anchor-action">
      <button
        type="button"
        onClick={handleAnchor}
        // Issue #198 – disabled while in-flight
        disabled={submitState === "pending" || submitState === "success"}
        className={`anchor-btn anchor-btn--${submitState}`}
        aria-busy={submitState === "pending"}
      >
        {submitState === "pending" && "Anchoring…"}
        {submitState === "success" && "Anchored ✓"}
        {(submitState === "idle" || submitState === "error") &&
          "Anchor Confession"}
      </button>
      {submitState === "error" && errorMsg && (
        <p className="anchor-action__error" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
