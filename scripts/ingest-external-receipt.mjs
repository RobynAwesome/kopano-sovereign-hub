import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { ingestReceipt } from './external-receipt-lib.mjs';

const receiptJson = process.env.KPGS_EXTERNAL_RECEIPT_JSON;
const ingestedBy = process.env.KPGS_INGESTED_BY;

if (!receiptJson) throw new Error('KPGS_EXTERNAL_RECEIPT_JSON is required');
if (!ingestedBy) throw new Error('KPGS_INGESTED_BY is required');

let receipt;
try {
  receipt = JSON.parse(receiptJson);
} catch (error) {
  throw new Error(`INVALID_RECEIPT_JSON: ${error instanceof Error ? error.message : String(error)}`);
}

const ledgerPath = receipt?.kind === 'commerce-order'
  ? 'governance/external-receipts/commerce.json'
  : receipt?.kind === 'creator-payout'
    ? 'governance/external-receipts/creator-payouts.json'
    : null;

if (!ledgerPath) throw new Error('receipt kind must be commerce-order or creator-payout');

const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const result = ingestReceipt(ledger, receipt, {
  ingestedAt: new Date().toISOString(),
  ingestedBy,
});

if (result.changed) {
  writeFileSync(ledgerPath, `${JSON.stringify(result.ledger, null, 2)}\n`, 'utf8');
}

const issueNumber = receipt.kind === 'commerce-order' ? 7 : 8;
const outputs = {
  ledger_path: ledgerPath,
  kc_receipt_id: result.entry.kcReceiptId,
  provider_receipt_id: result.entry.providerReceiptId,
  issue_number: String(issueNumber),
  changed: String(result.changed),
  outcome: result.outcome,
};

if (process.env.GITHUB_OUTPUT) {
  for (const [key, value] of Object.entries(outputs)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, 'utf8');
  }
}

console.log(JSON.stringify({
  schema: 'kopano.external-receipt-ingest.v1',
  gate: 'ALLOW',
  outcome: result.outcome,
  kind: receipt.kind,
  providerReceiptId: result.entry.providerReceiptId,
  kcReceiptId: result.entry.kcReceiptId,
  ledgerPath,
  truthBoundary: 'This receipt proves governed ingestion of externally originated transaction metadata. It does not replace or fabricate the provider-originated economic event.',
}, null, 2));
