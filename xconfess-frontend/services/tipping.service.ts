/**
 * tipping.service.ts
 * Issue #198 – Tip verification service used by TipButton
 * Issue #199 – Returns canonical backend tip state
 */

export type TipStatus = "pending" | "confirmed" | "failed" | "stale_pending";

export interface VerifyTipParams {
  confessionId: string;
  signedXdr: string;
}

export interface TipVerificationResult {
  tipId: string;
  status: TipStatus;
  confirmedAt?: string;
  failureReason?: string;
}

export async function verifyTip(
  params: VerifyTipParams,
): Promise<TipVerificationResult> {
  const response = await fetch("/api/tips/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body?.message ?? `Tip verification failed (${response.status})`,
    );
  }

  return response.json() as Promise<TipVerificationResult>;
}

export async function fetchTipStatus(
  tipId: string,
): Promise<TipVerificationResult> {
  const response = await fetch(`/api/tips/${tipId}/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tip status (${response.status})`);
  }
  return response.json() as Promise<TipVerificationResult>;
}
