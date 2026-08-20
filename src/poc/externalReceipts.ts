import commerceLedgerJson from '../../governance/external-receipts/commerce.json';
import creatorPayoutLedgerJson from '../../governance/external-receipts/creator-payouts.json';

export type ExternalEvidenceSource = {
  mode: 'production-provider';
  provider: string;
  reference: string;
};

export type KcExternalReceiptMetadata = {
  kcReceiptId: string;
  contentHash: string;
  ingestedAt: string;
  ingestedBy: string;
};

export type CommerceProviderReceipt = KcExternalReceiptMetadata & {
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

export type CreatorPayoutReceipt = KcExternalReceiptMetadata & {
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

type CommerceLedger = {
  schema: 'kopano.external-commerce-ledger.v1';
  receipts: CommerceProviderReceipt[];
};

type CreatorPayoutLedger = {
  schema: 'kopano.external-creator-payout-ledger.v1';
  receipts: CreatorPayoutReceipt[];
};

const commerceLedger = commerceLedgerJson as CommerceLedger;
const creatorPayoutLedger = creatorPayoutLedgerJson as CreatorPayoutLedger;

const commerceLedgerSchema = 'kopano.external-commerce-ledger.v1';
const creatorPayoutLedgerSchema = 'kopano.external-creator-payout-ledger.v1';
const commerceProductId = 'kopano-mark-decal-v1';
const commerceAmountMinor = 15000;
const boundedContributorId = 'founder:first-party';
const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const evidenceReferencePattern = /^[a-z][a-z0-9+.-]*:\/\//i;
const forbiddenEvidencePattern = /(?:fixture|sandbox|test|mock|demo|unpaid|draft)/i;
const contentHashPattern = /^sha256:[0-9a-f]{64}$/;
const commerceKcReceiptPattern = /^kc:commerce:[0-9a-f]{24}$/;
const creatorKcReceiptPattern = /^kc:creator-payout:[0-9a-f]{24}$/;

function validProductionEvidence(evidence: ExternalEvidenceSource) {
  return evidence.mode === 'production-provider'
    && evidence.provider.trim().length > 0
    && evidence.reference.trim().length > 0
    && evidenceReferencePattern.test(evidence.reference)
    && !forbiddenEvidencePattern.test(evidence.reference)
    && !forbiddenEvidencePattern.test(evidence.provider);
}

function validUtcTimestamp(value: string) {
  return isoDatePattern.test(value) && Number.isFinite(Date.parse(value));
}

function validIngestMetadata(metadata: KcExternalReceiptMetadata, kind: 'commerce-order' | 'creator-payout') {
  const receiptPattern = kind === 'commerce-order' ? commerceKcReceiptPattern : creatorKcReceiptPattern;
  return receiptPattern.test(metadata.kcReceiptId)
    && contentHashPattern.test(metadata.contentHash)
    && validUtcTimestamp(metadata.ingestedAt)
    && metadata.ingestedBy.startsWith('github:')
    && metadata.ingestedBy.length > 'github:'.length;
}

export function validateCommerceProviderReceipt(receipt: CommerceProviderReceipt) {
  const violations: string[] = [];

  if (!receipt.providerReceiptId.trim()) violations.push('provider receipt ID is required');
  if (!receipt.orderId.trim()) violations.push('order ID is required');
  if (receipt.productId !== commerceProductId) violations.push('receipt must match the governed Sprint 05 product');
  if (!Number.isInteger(receipt.amountMinor) || receipt.amountMinor !== commerceAmountMinor) {
    violations.push(`amount must equal governed unit price ${commerceAmountMinor} minor units`);
  }
  if (receipt.currency !== 'ZAR') violations.push('currency must be ZAR for the governed Sprint 05 product');
  if (receipt.status !== 'completed') violations.push('provider order must be completed');
  if (!validUtcTimestamp(receipt.occurredAt)) violations.push('occurredAt must be an ISO UTC timestamp');
  if (!validProductionEvidence(receipt.evidence)) violations.push('receipt must reference non-test production-provider evidence');
  if (!validIngestMetadata(receipt, 'commerce-order')) violations.push('KC ingestion metadata is invalid');

  return { valid: violations.length === 0, violations };
}

export function validateCreatorPayoutReceipt(receipt: CreatorPayoutReceipt) {
  const violations: string[] = [];

  if (!receipt.providerReceiptId.trim()) violations.push('provider receipt ID is required');
  if (!receipt.payoutId.trim()) violations.push('payout ID is required');
  if (receipt.contributorId !== boundedContributorId) violations.push('receipt must match the governed Sprint 06 contributor');
  if (!Number.isInteger(receipt.grossRevenueMinor) || receipt.grossRevenueMinor <= 0) violations.push('gross revenue must be a positive integer in minor units');
  if (!Number.isInteger(receipt.contributorAmountMinor) || receipt.contributorAmountMinor <= 0) violations.push('contributor amount must be a positive integer in minor units');
  if (!Number.isInteger(receipt.platformAmountMinor) || receipt.platformAmountMinor < 0) violations.push('platform amount must be a non-negative integer in minor units');
  if (receipt.contributorAmountMinor + receipt.platformAmountMinor !== receipt.grossRevenueMinor) violations.push('payout split must reconcile exactly to gross revenue');
  if (receipt.currency !== 'ZAR') violations.push('currency must be ZAR for this bounded proof');
  if (receipt.status !== 'paid') violations.push('creator payout must be paid');
  if (!validUtcTimestamp(receipt.occurredAt)) violations.push('occurredAt must be an ISO UTC timestamp');
  if (!validProductionEvidence(receipt.evidence)) violations.push('payout must reference non-test production-provider evidence');
  if (!validIngestMetadata(receipt, 'creator-payout')) violations.push('KC ingestion metadata is invalid');

  const expectedContributor = Math.round(receipt.grossRevenueMinor * 0.7);
  if (Math.abs(receipt.contributorAmountMinor - expectedContributor) > 1) {
    violations.push('contributor payout must validate the governed 70/30 revenue-share model within one minor unit of rounding');
  }

  return { valid: violations.length === 0, violations };
}

export const productionCommerceReceipts: CommerceProviderReceipt[] = commerceLedger.schema === commerceLedgerSchema
  ? commerceLedger.receipts
  : [];

export const productionCreatorPayoutReceipts: CreatorPayoutReceipt[] = creatorPayoutLedger.schema === creatorPayoutLedgerSchema
  ? creatorPayoutLedger.receipts
  : [];

export function validatedCommerceReceipts() {
  return productionCommerceReceipts.filter((receipt) => validateCommerceProviderReceipt(receipt).valid);
}

export function validatedCreatorPayoutReceipts() {
  return productionCreatorPayoutReceipts.filter((receipt) => validateCreatorPayoutReceipt(receipt).valid);
}
