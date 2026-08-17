export type ExternalEvidenceSource = {
  mode: 'production-provider';
  provider: string;
  reference: string;
};

export type CommerceProviderReceipt = {
  kind: 'commerce-order';
  providerReceiptId: string;
  orderId: string;
  productId: string;
  amountMinor: number;
  currency: 'ZAR';
  status: 'completed';
  occurredAt: string;
  evidence: ExternalEvidenceSource;
};

export type CreatorPayoutReceipt = {
  kind: 'creator-payout';
  providerReceiptId: string;
  payoutId: string;
  contributorId: string;
  grossRevenueMinor: number;
  contributorAmountMinor: number;
  platformAmountMinor: number;
  currency: 'ZAR';
  status: 'paid';
  occurredAt: string;
  evidence: ExternalEvidenceSource;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const forbiddenEvidencePattern = /(?:fixture|sandbox|test|mock|demo)/i;

function validProductionEvidence(evidence: ExternalEvidenceSource) {
  return evidence.mode === 'production-provider'
    && evidence.provider.trim().length > 0
    && evidence.reference.trim().length > 0
    && !forbiddenEvidencePattern.test(evidence.reference)
    && !forbiddenEvidencePattern.test(evidence.provider);
}

export function validateCommerceProviderReceipt(receipt: CommerceProviderReceipt) {
  const violations: string[] = [];

  if (!receipt.providerReceiptId.trim()) violations.push('provider receipt ID is required');
  if (!receipt.orderId.trim()) violations.push('order ID is required');
  if (receipt.productId !== 'kopano-mark-decal-v1') violations.push('receipt must match the governed Sprint 05 product');
  if (!Number.isInteger(receipt.amountMinor) || receipt.amountMinor <= 0) violations.push('amount must be a positive integer in minor units');
  if (receipt.currency !== 'ZAR') violations.push('currency must be ZAR for the governed Sprint 05 product');
  if (receipt.status !== 'completed') violations.push('provider order must be completed');
  if (!isoDatePattern.test(receipt.occurredAt)) violations.push('occurredAt must be an ISO UTC timestamp');
  if (!validProductionEvidence(receipt.evidence)) violations.push('receipt must reference non-test production-provider evidence');

  return { valid: violations.length === 0, violations };
}

export function validateCreatorPayoutReceipt(receipt: CreatorPayoutReceipt) {
  const violations: string[] = [];

  if (!receipt.providerReceiptId.trim()) violations.push('provider receipt ID is required');
  if (!receipt.payoutId.trim()) violations.push('payout ID is required');
  if (!receipt.contributorId.trim()) violations.push('contributor ID is required');
  if (!Number.isInteger(receipt.grossRevenueMinor) || receipt.grossRevenueMinor <= 0) violations.push('gross revenue must be a positive integer in minor units');
  if (!Number.isInteger(receipt.contributorAmountMinor) || receipt.contributorAmountMinor <= 0) violations.push('contributor amount must be a positive integer in minor units');
  if (!Number.isInteger(receipt.platformAmountMinor) || receipt.platformAmountMinor < 0) violations.push('platform amount must be a non-negative integer in minor units');
  if (receipt.contributorAmountMinor + receipt.platformAmountMinor !== receipt.grossRevenueMinor) violations.push('payout split must reconcile exactly to gross revenue');
  if (receipt.currency !== 'ZAR') violations.push('currency must be ZAR for this bounded proof');
  if (receipt.status !== 'paid') violations.push('creator payout must be paid');
  if (!isoDatePattern.test(receipt.occurredAt)) violations.push('occurredAt must be an ISO UTC timestamp');
  if (!validProductionEvidence(receipt.evidence)) violations.push('payout must reference non-test production-provider evidence');

  const expectedContributor = Math.round(receipt.grossRevenueMinor * 0.7);
  if (Math.abs(receipt.contributorAmountMinor - expectedContributor) > 1) {
    violations.push('contributor payout must validate the governed 70/30 revenue-share model within one minor unit of rounding');
  }

  return { valid: violations.length === 0, violations };
}

// Intentionally empty until evidence originates from a real external provider.
// Never insert fixtures, sandbox objects, unpaid invoices, self-authored receipts or fabricated IDs.
export const productionCommerceReceipts: CommerceProviderReceipt[] = [];
export const productionCreatorPayoutReceipts: CreatorPayoutReceipt[] = [];

export function validatedCommerceReceipts() {
  return productionCommerceReceipts.filter((receipt) => validateCommerceProviderReceipt(receipt).valid);
}

export function validatedCreatorPayoutReceipts() {
  return productionCreatorPayoutReceipts.filter((receipt) => validateCreatorPayoutReceipt(receipt).valid);
}
