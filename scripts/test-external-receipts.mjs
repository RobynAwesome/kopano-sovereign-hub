import assert from 'node:assert/strict';
import {
  COMMERCE_AMOUNT_MINOR,
  COMMERCE_PRODUCT_ID,
  CREATOR_CONTRIBUTOR_ID,
  LEDGER_SCHEMAS,
  ingestReceipt,
  materializeLedgerEntry,
  validateCommerceSourceReceipt,
  validateCreatorSourceReceipt,
  validateLedger,
} from './external-receipt-lib.mjs';

const now = '2026-08-20T06:00:00Z';
const actor = 'github:RobynAwesome';

const commerce = {
  kind: 'commerce-order',
  providerReceiptId: 'provider-order-receipt-001',
  orderId: 'provider-order-001',
  productId: COMMERCE_PRODUCT_ID,
  amountMinor: COMMERCE_AMOUNT_MINOR,
  currency: 'ZAR',
  status: 'completed',
  occurredAt: '2026-08-20T05:30:00Z',
  evidence: {
    mode: 'production-provider',
    provider: 'merchant-provider',
    reference: 'provider://orders/001',
  },
};

assert.equal(validateCommerceSourceReceipt(commerce).valid, true);
assert.equal(validateCommerceSourceReceipt({ ...commerce, amountMinor: 14999 }).valid, false);
assert.equal(validateCommerceSourceReceipt({
  ...commerce,
  evidence: { ...commerce.evidence, reference: 'provider://sandbox/orders/001' },
}).valid, false);

const emptyCommerceLedger = { schema: LEDGER_SCHEMAS['commerce-order'], receipts: [] };
const firstCommerce = ingestReceipt(emptyCommerceLedger, commerce, { ingestedAt: now, ingestedBy: actor });
assert.equal(firstCommerce.changed, true);
assert.match(firstCommerce.entry.kcReceiptId, /^kc:commerce:[0-9a-f]{24}$/);
assert.equal(validateLedger(firstCommerce.ledger, 'commerce-order').valid, true);

const replayCommerce = ingestReceipt(firstCommerce.ledger, commerce, { ingestedAt: now, ingestedBy: actor });
assert.equal(replayCommerce.changed, false);
assert.equal(replayCommerce.outcome, 'REPLAY');
assert.equal(replayCommerce.entry.kcReceiptId, firstCommerce.entry.kcReceiptId);

assert.throws(
  () => ingestReceipt(firstCommerce.ledger, { ...commerce, orderId: 'provider-order-002' }, { ingestedAt: now, ingestedBy: actor }),
  /PROVIDER_RECEIPT_COLLISION/,
);

const creator = {
  kind: 'creator-payout',
  providerReceiptId: 'provider-payout-receipt-001',
  payoutId: 'provider-payout-001',
  contributorId: CREATOR_CONTRIBUTOR_ID,
  grossRevenueMinor: 10000,
  contributorAmountMinor: 7000,
  platformAmountMinor: 3000,
  currency: 'ZAR',
  status: 'paid',
  occurredAt: '2026-08-20T05:40:00Z',
  evidence: {
    mode: 'production-provider',
    provider: 'merchant-provider',
    reference: 'provider://payouts/001',
  },
};

assert.equal(validateCreatorSourceReceipt(creator).valid, true);
assert.equal(validateCreatorSourceReceipt({
  ...creator,
  contributorAmountMinor: 6900,
  platformAmountMinor: 3100,
}).valid, false);
assert.equal(validateCreatorSourceReceipt({ ...creator, contributorId: 'someone-else' }).valid, false);

const emptyCreatorLedger = { schema: LEDGER_SCHEMAS['creator-payout'], receipts: [] };
const firstCreator = ingestReceipt(emptyCreatorLedger, creator, { ingestedAt: now, ingestedBy: actor });
assert.equal(firstCreator.changed, true);
assert.match(firstCreator.entry.kcReceiptId, /^kc:creator-payout:[0-9a-f]{24}$/);
assert.equal(validateLedger(firstCreator.ledger, 'creator-payout').valid, true);

const tamperedCreator = structuredClone(firstCreator.ledger);
tamperedCreator.receipts[0].grossRevenueMinor = 10001;
assert.equal(validateLedger(tamperedCreator, 'creator-payout').valid, false);

const tamperedCommerceEntry = materializeLedgerEntry(commerce, { ingestedAt: now, ingestedBy: actor });
tamperedCommerceEntry.contentHash = `sha256:${'0'.repeat(64)}`;
assert.equal(validateLedger({ schema: LEDGER_SCHEMAS['commerce-order'], receipts: [tamperedCommerceEntry] }, 'commerce-order').valid, false);

console.log('KPGS_EXTERNAL_RECEIPTS_TESTS_PASS');
