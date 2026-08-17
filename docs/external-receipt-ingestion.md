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

## Closure procedure

1. Preserve the provider-originated evidence outside the repository or in a governed evidence store.
2. Record a stable provider/reference identifier; do not paste secrets, card data or unnecessary personal information into GitHub.
3. Add the minimal typed receipt record to the production receipt array.
4. Build/typecheck the Hub when GitHub runners are available.
5. Confirm the runtime proof ledger reports `PASS` for the relevant issue.
6. Close the issue with the provider receipt ID, commit SHA and validation result—not with the raw private receipt.
