import { readFileSync } from 'node:fs';
import { validateLedger } from './external-receipt-lib.mjs';

const ledgers = [
  ['commerce-order', 'governance/external-receipts/commerce.json'],
  ['creator-payout', 'governance/external-receipts/creator-payouts.json'],
];

let failed = false;
const summary = [];

for (const [kind, path] of ledgers) {
  let ledger;
  try {
    ledger = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    failed = true;
    console.error(`${path}: unable to parse ledger: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  const validation = validateLedger(ledger, kind);
  const count = Array.isArray(ledger.receipts) ? ledger.receipts.length : 0;
  const state = validation.valid ? (count > 0 ? 'PASS' : 'EXTERNAL_GATE') : 'FAIL';
  summary.push({ kind, path, count, state });

  if (!validation.valid) {
    failed = true;
    validation.violations.forEach((violation) => console.error(`${path}: ${violation}`));
  }
}

console.log(JSON.stringify({ schema: 'kopano.external-receipt-validation.v1', ledgers: summary }, null, 2));
if (failed) process.exit(1);
console.log('KPGS_EXTERNAL_RECEIPTS_LEDGER_VALID');
