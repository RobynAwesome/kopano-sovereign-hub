import { createHash } from 'node:crypto';

export const COMMERCE_PRODUCT_ID = 'kopano-mark-decal-v1';
export const COMMERCE_AMOUNT_MINOR = 15000;
export const CREATOR_CONTRIBUTOR_ID = 'founder:first-party';

export const LEDGER_SCHEMAS = Object.freeze({
  'commerce-order': 'kopano.external-commerce-ledger.v1',
  'creator-payout': 'kopano.external-creator-payout-ledger.v1',
});

const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const safeIdentifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const evidenceReferencePattern = /^[a-z][a-z0-9+.-]*:\/\//i;
const sha256Pattern = /^sha256:[0-9a-f]{64}$/;
const forbiddenEvidencePattern = /(?:fixture|sandbox|test|mock|demo|unpaid|draft)/i;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeIdentifier(value) {
  return nonEmptyString(value) && safeIdentifierPattern.test(value);
}

function validUtcTimestamp(value, { allowFuture = false } = {}) {
  if (!nonEmptyString(value) || !isoDatePattern.test(value)) return false;
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) return false;
  if (!allowFuture && epoch > Date.now() + 5 * 60 * 1000) return false;
  return true;
}

function evidenceViolations(evidence) {
  const violations = [];
  if (!isRecord(evidence)) return ['evidence object is required'];
  if (evidence.mode !== 'production-provider') violations.push('evidence mode must be production-provider');
  if (!nonEmptyString(evidence.provider)) violations.push('production provider is required');
  if (!nonEmptyString(evidence.reference)) violations.push('production evidence reference is required');
  if (nonEmptyString(evidence.provider) && forbiddenEvidencePattern.test(evidence.provider)) {
    violations.push('provider name cannot describe fixture/sandbox/test/mock/demo/unpaid/draft evidence');
  }
  if (nonEmptyString(evidence.reference) && forbiddenEvidencePattern.test(evidence.reference)) {
    violations.push('evidence reference cannot describe fixture/sandbox/test/mock/demo/unpaid/draft evidence');
  }
  if (nonEmptyString(evidence.reference) && !evidenceReferencePattern.test(evidence.reference)) {
    violations.push('evidence reference must be a stable URI');
  }
  return violations;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function sourceReceiptFromLedgerEntry(entry) {
  if (!isRecord(entry)) return entry;
  const {
    kcReceiptId: _kcReceiptId,
    contentHash: _contentHash,
    ingestedAt: _ingestedAt,
    ingestedBy: _ingestedBy,
    ...source
  } = entry;
  return source;
}

export function validateCommerceSourceReceipt(receipt) {
  const violations = [];
  if (!isRecord(receipt)) return { valid: false, violations: ['commerce receipt object is required'] };

  if (receipt.kind !== 'commerce-order') violations.push('kind must be commerce-order');
  if (!safeIdentifier(receipt.providerReceiptId)) violations.push('provider receipt ID must be a safe non-empty identifier');
  if (!safeIdentifier(receipt.orderId)) violations.push('order ID must be a safe non-empty identifier');
  if (receipt.productId !== COMMERCE_PRODUCT_ID) violations.push(`productId must be ${COMMERCE_PRODUCT_ID}`);
  if (!Number.isInteger(receipt.amountMinor) || receipt.amountMinor !== COMMERCE_AMOUNT_MINOR) {
    violations.push(`amountMinor must equal governed unit price ${COMMERCE_AMOUNT_MINOR}`);
  }
  if (receipt.currency !== 'ZAR') violations.push('currency must be ZAR');
  if (receipt.status !== 'completed') violations.push('provider order must be completed');
  if (!validUtcTimestamp(receipt.occurredAt)) violations.push('occurredAt must be a non-future ISO UTC timestamp');
  violations.push(...evidenceViolations(receipt.evidence));

  return { valid: violations.length === 0, violations };
}

export function validateCreatorSourceReceipt(receipt) {
  const violations = [];
  if (!isRecord(receipt)) return { valid: false, violations: ['creator payout receipt object is required'] };

  if (receipt.kind !== 'creator-payout') violations.push('kind must be creator-payout');
  if (!safeIdentifier(receipt.providerReceiptId)) violations.push('provider receipt ID must be a safe non-empty identifier');
  if (!safeIdentifier(receipt.payoutId)) violations.push('payout ID must be a safe non-empty identifier');
  if (receipt.contributorId !== CREATOR_CONTRIBUTOR_ID) {
    violations.push(`contributorId must match bounded Sprint 06 contributor ${CREATOR_CONTRIBUTOR_ID}`);
  }
  if (!Number.isInteger(receipt.grossRevenueMinor) || receipt.grossRevenueMinor <= 0) {
    violations.push('grossRevenueMinor must be a positive integer');
  }
  if (!Number.isInteger(receipt.contributorAmountMinor) || receipt.contributorAmountMinor <= 0) {
    violations.push('contributorAmountMinor must be a positive integer');
  }
  if (!Number.isInteger(receipt.platformAmountMinor) || receipt.platformAmountMinor < 0) {
    violations.push('platformAmountMinor must be a non-negative integer');
  }
  if (
    Number.isInteger(receipt.grossRevenueMinor)
    && Number.isInteger(receipt.contributorAmountMinor)
    && Number.isInteger(receipt.platformAmountMinor)
    && receipt.contributorAmountMinor + receipt.platformAmountMinor !== receipt.grossRevenueMinor
  ) {
    violations.push('payout split must reconcile exactly to gross revenue');
  }
  if (receipt.currency !== 'ZAR') violations.push('currency must be ZAR');
  if (receipt.status !== 'paid') violations.push('creator payout must be paid');
  if (!validUtcTimestamp(receipt.occurredAt)) violations.push('occurredAt must be a non-future ISO UTC timestamp');
  violations.push(...evidenceViolations(receipt.evidence));

  if (Number.isInteger(receipt.grossRevenueMinor) && Number.isInteger(receipt.contributorAmountMinor)) {
    const expectedContributor = Math.round(receipt.grossRevenueMinor * 0.7);
    if (Math.abs(receipt.contributorAmountMinor - expectedContributor) > 1) {
      violations.push('contributor payout must validate the governed 70/30 split within one minor unit');
    }
  }

  return { valid: violations.length === 0, violations };
}

export function validateSourceReceipt(receipt) {
  if (!isRecord(receipt)) return { valid: false, violations: ['receipt object is required'] };
  if (receipt.kind === 'commerce-order') return validateCommerceSourceReceipt(receipt);
  if (receipt.kind === 'creator-payout') return validateCreatorSourceReceipt(receipt);
  return { valid: false, violations: ['kind must be commerce-order or creator-payout'] };
}

export function expectedReceiptMetadata(sourceReceipt) {
  const sourceHash = sha256Hex(canonicalJson(sourceReceipt));
  const prefix = sourceReceipt.kind === 'commerce-order' ? 'kc:commerce:' : 'kc:creator-payout:';
  return {
    kcReceiptId: `${prefix}${sourceHash.slice(0, 24)}`,
    contentHash: `sha256:${sourceHash}`,
  };
}

export function materializeLedgerEntry(sourceReceipt, { ingestedAt, ingestedBy }) {
  const sourceValidation = validateSourceReceipt(sourceReceipt);
  if (!sourceValidation.valid) {
    throw new Error(`INVALID_EXTERNAL_RECEIPT: ${sourceValidation.violations.join('; ')}`);
  }
  if (!validUtcTimestamp(ingestedAt, { allowFuture: true })) {
    throw new Error('INVALID_INGESTED_AT');
  }
  if (!nonEmptyString(ingestedBy) || !ingestedBy.startsWith('github:')) {
    throw new Error('INVALID_INGESTED_BY');
  }
  return {
    ...sourceReceipt,
    ...expectedReceiptMetadata(sourceReceipt),
    ingestedAt,
    ingestedBy,
  };
}

export function validateLedgerEntry(entry, expectedKind) {
  const violations = [];
  if (!isRecord(entry)) return { valid: false, violations: ['ledger entry object is required'] };
  const sourceReceipt = sourceReceiptFromLedgerEntry(entry);
  const sourceValidation = validateSourceReceipt(sourceReceipt);
  violations.push(...sourceValidation.violations);
  if (sourceReceipt?.kind !== expectedKind) violations.push(`ledger entry kind must be ${expectedKind}`);

  if (!nonEmptyString(entry.kcReceiptId)) violations.push('kcReceiptId is required');
  if (!nonEmptyString(entry.contentHash) || !sha256Pattern.test(entry.contentHash)) violations.push('contentHash must be sha256:<64 lowercase hex>');
  if (!validUtcTimestamp(entry.ingestedAt, { allowFuture: true })) violations.push('ingestedAt must be an ISO UTC timestamp');
  if (!nonEmptyString(entry.ingestedBy) || !entry.ingestedBy.startsWith('github:')) violations.push('ingestedBy must identify the GitHub actor');

  if (sourceValidation.valid) {
    const expected = expectedReceiptMetadata(sourceReceipt);
    if (entry.kcReceiptId !== expected.kcReceiptId) violations.push('kcReceiptId does not match canonical source receipt hash');
    if (entry.contentHash !== expected.contentHash) violations.push('contentHash does not match canonical source receipt');
  }

  return { valid: violations.length === 0, violations };
}

function domainIdentity(entry, kind) {
  return kind === 'commerce-order' ? entry.orderId : entry.payoutId;
}

export function validateLedger(ledger, kind) {
  const violations = [];
  if (!isRecord(ledger)) return { valid: false, violations: ['ledger object is required'] };
  if (ledger.schema !== LEDGER_SCHEMAS[kind]) violations.push(`ledger schema must be ${LEDGER_SCHEMAS[kind]}`);
  if (!Array.isArray(ledger.receipts)) return { valid: false, violations: [...violations, 'ledger receipts must be an array'] };

  const providerIds = new Set();
  const domainIds = new Set();
  const kcReceiptIds = new Set();

  ledger.receipts.forEach((entry, index) => {
    const result = validateLedgerEntry(entry, kind);
    result.violations.forEach((violation) => violations.push(`receipts[${index}]: ${violation}`));

    if (isRecord(entry)) {
      const providerId = entry.providerReceiptId;
      if (nonEmptyString(providerId)) {
        if (providerIds.has(providerId)) violations.push(`duplicate providerReceiptId: ${providerId}`);
        providerIds.add(providerId);
      }

      const domainId = domainIdentity(entry, kind);
      if (nonEmptyString(domainId)) {
        if (domainIds.has(domainId)) violations.push(`duplicate ${kind === 'commerce-order' ? 'orderId' : 'payoutId'}: ${domainId}`);
        domainIds.add(domainId);
      }

      if (nonEmptyString(entry.kcReceiptId)) {
        if (kcReceiptIds.has(entry.kcReceiptId)) violations.push(`duplicate kcReceiptId: ${entry.kcReceiptId}`);
        kcReceiptIds.add(entry.kcReceiptId);
      }
    }
  });

  return { valid: violations.length === 0, violations };
}

export function ingestReceipt(ledger, sourceReceipt, { ingestedAt, ingestedBy }) {
  const sourceValidation = validateSourceReceipt(sourceReceipt);
  if (!sourceValidation.valid) {
    throw new Error(`INVALID_EXTERNAL_RECEIPT: ${sourceValidation.violations.join('; ')}`);
  }
  const kind = sourceReceipt.kind;
  const ledgerValidation = validateLedger(ledger, kind);
  if (!ledgerValidation.valid) {
    throw new Error(`INVALID_EXISTING_LEDGER: ${ledgerValidation.violations.join('; ')}`);
  }

  const sourceHash = expectedReceiptMetadata(sourceReceipt).contentHash;
  const existing = ledger.receipts.find((entry) => entry.providerReceiptId === sourceReceipt.providerReceiptId);
  if (existing) {
    if (existing.contentHash === sourceHash) {
      return { changed: false, outcome: 'REPLAY', entry: existing, ledger };
    }
    throw new Error(`PROVIDER_RECEIPT_COLLISION: ${sourceReceipt.providerReceiptId}`);
  }

  const identityField = kind === 'commerce-order' ? 'orderId' : 'payoutId';
  const identityValue = sourceReceipt[identityField];
  const sameDomainIdentity = ledger.receipts.find((entry) => entry[identityField] === identityValue);
  if (sameDomainIdentity) {
    throw new Error(`DOMAIN_RECEIPT_COLLISION: ${identityField}=${identityValue}`);
  }

  const entry = materializeLedgerEntry(sourceReceipt, { ingestedAt, ingestedBy });
  const receipts = [...ledger.receipts, entry].sort((left, right) => {
    const time = String(left.occurredAt).localeCompare(String(right.occurredAt));
    return time !== 0 ? time : String(left.providerReceiptId).localeCompare(String(right.providerReceiptId));
  });
  const nextLedger = { ...ledger, receipts };
  const nextValidation = validateLedger(nextLedger, kind);
  if (!nextValidation.valid) {
    throw new Error(`INVALID_RESULTING_LEDGER: ${nextValidation.violations.join('; ')}`);
  }

  return { changed: true, outcome: 'INGESTED', entry, ledger: nextLedger };
}
