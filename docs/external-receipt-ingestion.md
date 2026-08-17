# External Receipt Ingestion Gate

Issues #7 and #8 are code-complete but remain intentionally open until real economic-world evidence exists.

## Sprint 05 — Commerce / OWN (#7)

A closing receipt must be a real completed production-provider order for `kopano-mark-decal-v1` and must contain:

- provider receipt ID;
- order ID;
- product ID;
- positive amount in ZAR minor units;
- completed status;
- UTC occurrence timestamp;
- production-provider evidence reference.

The validator rejects fixture, sandbox, test, mock and demo evidence.

## Sprint 06 — CREATE + EARN (#8)

A closing payout receipt must contain:

- provider receipt ID;
- payout ID;
- contributor ID;
- gross revenue in ZAR minor units;
- contributor amount;
- platform amount;
- paid status;
- UTC occurrence timestamp;
- production-provider evidence reference.

The payout must reconcile exactly to gross revenue and validate the governed 70/30 contributor/platform model within one minor unit of rounding.

## Ingestion rule

Add only externally originated evidence to `src/poc/externalReceipts.ts`. Do not insert self-authored receipts, unpaid invoices, fixtures, sandbox objects or fabricated provider IDs.

`evaluateBacklogProofs()` moves #7 or #8 from `EXTERNAL_GATE` to `PASS` only when the corresponding typed validator accepts at least one production receipt.
