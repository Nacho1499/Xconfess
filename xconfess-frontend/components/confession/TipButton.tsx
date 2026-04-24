/**
 * TipButton.tsx
 * Issue #196 – Block tip submission on network mismatch
 * Issue #198 – Prevent duplicate tip verification submits
 */

"use client";

import React, { useCallback, useRef, useState } from "react";
import { useStellarWallet } from "@/app/lib/hooks/useStellarWallet";
import { verifyTip } from "@/lib/services/tipping.service";

interface TipButtonProps {
  confessionId: string;
  tipXdr: string;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

type SubmitState = "idle" | "pending" | "success" | "error";

export function TipButton({
  confessionId,
  tipXdr,
  onSuccess,
  onError,
}: TipButtonProps) {
  const wallet = useStellarWallet();
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Issue #198 – single in-flight guard
  const inFlightRef = useRef(false);

  const handleTip = useCallback(async () => {
    if (inFlightRef.current || submitState === "pending") return;

    inFlightRef.current = true;
    setSubmitState("pending");
    setErrorMsg(null);

    try {
      const signedXdr = await wallet.signAndSubmitAnchorTx(tipXdr);
      await verifyTip({ confessionId, signedXdr });
      setSubmitState("success");
      onSuccess?.();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setSubmitState("error");
      setErrorMsg(e.message);
      onError?.(e);
    } finally {
      inFlightRef.current = false;
    }
  }, [confessionId, onError, onSuccess, submitState, tipXdr, wallet]);

  const handleRetry = useCallback(() => {
    setSubmitState("idle");
    setErrorMsg(null);
  }, []);

  if (!wallet.isConnected) {
    return (
      <button
        type="button"
        onClick={wallet.connect}
        disabled={wallet.isConnecting}
        className="tip-btn tip-btn--connect"
      >
        {wallet.isConnecting ? "Connecting…" : "Connect Wallet to Tip"}
      </button>
    );
  }

  // Issue #196 – network mismatch blocks tip CTA
  if (wallet.networkMismatch) {
    return (
      <div className="tip-mismatch" role="alert">
        <p className="tip-mismatch__message">
          Wallet is on <strong>{wallet.network}</strong> — switch to{" "}
          <strong>
            {process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet"}
          </strong>{" "}
          in Freighter to send a tip.
        </p>
        <button type="button" className="tip-btn tip-btn--disabled" disabled>
          Send Tip
        </button>
      </div>
    );
  }

  return (
    <div className="tip-action">
      <button
        type="button"
        onClick={handleTip}
        disabled={submitState === "pending" || submitState === "success"}
        className={`tip-btn tip-btn--${submitState}`}
        aria-busy={submitState === "pending"}
      >
        {submitState === "pending" && "Sending…"}
        {submitState === "success" && "Tipped ✓"}
        {(submitState === "idle" || submitState === "error") && "Send Tip"}
      </button>

      {submitState === "error" && (
        <>
          {errorMsg && (
            <p className="tip-action__error" role="alert">
              {errorMsg}
            </p>
          )}
          <button
            type="button"
            onClick={handleRetry}
            className="tip-btn tip-btn--retry"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}
