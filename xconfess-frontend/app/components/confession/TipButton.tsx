"use client";

import { useState, useEffect } from "react";
import {
  sendTip,
  verifyTip,
  getTipStats,
  type TipStats,
} from "@/lib/services/tipping.service";
import { useWallet } from "@/lib/hooks/useWallet";
import { getWalletCTAState } from "@/lib/hooks/useWalletCTAState";
import { useActivityStore } from "@/app/lib/store/activity.store";
import { v4 as uuidv4 } from "uuid";

interface TipButtonProps {
  confessionId: string;
  recipientAddress?: string;
  initialStats?: TipStats;
}

export const TipButton = ({
  confessionId,
  recipientAddress,
  initialStats,
}: TipButtonProps) => {
  const addActivity = useActivityStore((s) => s.addActivity);
  const updateActivity = useActivityStore((s) => s.updateActivity);

  const [isOpen, setIsOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("0.1");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [stats, setStats] = useState<TipStats | null>(initialStats || null);

  const wallet = useWallet();
  const { isConnected, connect } = wallet;
  const walletCTA = getWalletCTAState(wallet, { extraDisabled: isSending });

  useEffect(() => {
    const fetchStats = async () => {
      const tipStats = await getTipStats(confessionId);
      if (tipStats) setStats(tipStats);
    };
    fetchStats();
  }, [confessionId]);

  const refreshStats = async () => {
    const updated = await getTipStats(confessionId);
    if (updated) setStats(updated);
  };

  const handleTip = async () => {
    if (isSending) return;

    if (!recipientAddress) {
      setError("Recipient address not available");
      return;
    }

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount < 0.1) {
      setError("Minimum tip is 0.1 XLM");
      return;
    }

    if (!isConnected) {
      try {
        await connect();
      } catch {
        setError("Connect your wallet");
        return;
      }
    }

    setIsSending(true);
    setError(null);
    setSuccess(false);

    // ✅ Create activity
    const activityId = uuidv4();
    addActivity({
      id: activityId,
      type: "tip",
      status: "submitted",
      createdAt: Date.now(),
      confessionId,
      amount,
    });

    try {
      const result = await sendTip(confessionId, amount, recipientAddress);

      if (!result.success || !result.txHash) {
        throw new Error(result.error || "Failed to send tip");
      }

      // update tx hash
      updateActivity(activityId, { txHash: result.txHash });

      const verifyResult = await verifyTip(confessionId, result.txHash);

      if (!verifyResult.success) {
        setPendingTxHash(result.txHash);

        updateActivity(activityId, {
          status: "submitted",
          updatedAt: Date.now(),
        });

        throw new Error("Verification pending");
      }

      // ✅ success
      updateActivity(activityId, {
        status: "confirmed",
        updatedAt: Date.now(),
      });

      setSuccess(true);
      setTipAmount("0.1");
      setPendingTxHash(null);
      await refreshStats();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      updateActivity(activityId, {
        status: "failed",
        updatedAt: Date.now(),
      });

      setError(err.message || "Failed to send tip");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (isSending || !pendingTxHash) return;

    setIsSending(true);
    setError(null);

    try {
      const verifyResult = await verifyTip(confessionId, pendingTxHash);

      if (!verifyResult.success) {
        throw new Error("Verification still pending");
      }

      // success
      setSuccess(true);
      setPendingTxHash(null);
      await refreshStats();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsSending(false);
    }
  };

  const totalAmount = stats?.totalAmount || 0;
  const tipCount = stats?.totalCount || 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!recipientAddress}
        aria-label="Tip confession"
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
      >
        💰 {tipCount > 0 && tipCount}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-800 p-4 rounded">
          <h3 className="text-white mb-2">Send Tip</h3>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">Success 🎉</p>}

          {pendingTxHash && (
            <div className="mt-2 space-y-2">
              <p className="text-yellow-400 text-sm">
                Verification pending...
              </p>
              <button
                onClick={handleVerify}
                disabled={isSending}
                className="w-full text-xs bg-zinc-700 hover:bg-zinc-600 py-1 rounded text-zinc-300"
              >
                {isSending ? "Verifying..." : "Retry Verification"}
              </button>
            </div>
          )}

          <input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            className="w-full p-2 bg-zinc-900 text-white mt-2"
          />

          {walletCTA.status === "not-installed" && (
            <div className="text-xs text-yellow-400 mt-2">
              {walletCTA.guidance}
            </div>
          )}

          <button
            onClick={handleTip}
            disabled={walletCTA.disabled}
            className="w-full mt-3 bg-purple-600 py-2 rounded disabled:opacity-50"
            aria-label={isSending ? "Sending tip" : walletCTA.status === "not-connected" ? "Connect Wallet to Tip" : `Send ${tipAmount} XLM tip`}
          >
            {isSending
              ? "Sending..."
              : walletCTA.status === "not-connected"
                ? "Connect Wallet to Tip"
                : `Tip ${tipAmount} XLM`}
          </button>

          {walletCTA.status === "not-ready" && (
            <div className="text-xs text-orange-400 mt-2">
              {walletCTA.guidance}
            </div>
          )}

          <div className="text-xs text-gray-400 mt-3">
            {totalAmount.toFixed(2)} XLM • {tipCount} tips
          </div>
        </div>
      )}
    </div>
  );
};