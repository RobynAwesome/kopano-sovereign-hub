# External Economic Receipt Ingestion

Issues #7 and #8 have one bounded closure membrane. Provider-originated economic evidence stays outside GitHub; the Hub stores only the minimum validated metadata required to bind that evidence to a canonical KC receipt and exact commit.

## Canonical ledgers

- Commerce / OWN: `governance/external-receipts/commerce.json`
- CREATE + EARN: `governance/external-receipts/creator-payouts.json`

Empty ledgers are valid and mean `EXTERNAL_GATE`. They are not a software failure. A ledger entry is accepted only after validation, replay/collision checks, deterministic KC receipt derivation and full Hub build gates.

Every committed ledger entry includes:

- the minimal provider transaction metadata;
- deterministic `kcReceiptId` derived from the canonical source-receipt SHA-256;
- `contentHash` binding the exact source metadata;
- `ingestedAt`;
- `ingestedBy` identifying the GitHub actor.

Never store card numbers, bank details, customer addresses, credentials, access tokens, raw private receipts or unrelated personal information in these ledgers.

## Sprint 05 — Commerce / OWN (#7)

The bounded proof accepts exactly the governed merchandise item:

- `productId`: `kopano-mark-decal-v1`
- `amountMinor`: `15000`
- `currency`: `ZAR`
- `status`: `completed`

It also requires provider receipt ID, order ID, UTC occurrence timestamp, production provider and a stable provider evidence URI.

Example shape only — values below are placeholders and must never be submitted as evidence:

```json
{
  "kind": "commerce-order",
  "providerReceiptId": "REAL_PROVIDER_RECEIPT_ID",
  "orderId": "REAL_ORDER_ID",
  "productId": "kopano-mark-decal-v1",
  "amountMinor": 15000,
  "currency": "ZAR",
  "status": "completed",
  "occurredAt": "2026-08-20T06:00:00Z",
  "evidence": {
    "mode": "production-provider",
    "provider": "REAL_PROVIDER",
    "reference": "provider://REAL_STABLE_REFERENCE"
  }
}
```

## Sprint 06 — CREATE + EARN (#8)

The bounded proof accepts the currently governed contributor model:

- `contributorId`: `founder:first-party`
- `currency`: `ZAR`
- `status`: `paid`
- contributor + platform amounts must equal gross revenue exactly;
- contributor share must validate the governed 70/30 split within one minor unit of rounding.

Example shape only — values below are placeholders and must never be submitted as evidence:

```json
{
  "kind": "creator-payout",
  "providerReceiptId": "REAL_PROVIDER_RECEIPT_ID",
  "payoutId": "REAL_PAYOUT_ID",
  "contributorId": "founder:first-party",
  "grossRevenueMinor": 10000,
  "contributorAmountMinor": 7000,
  "platformAmountMinor": 3000,
  "currency": "ZAR",
  "status": "paid",
  "occurredAt": "2026-08-20T06:00:00Z",
  "evidence": {
    "mode": "production-provider",
    "provider": "REAL_PROVIDER",
    "reference": "provider://REAL_STABLE_REFERENCE"
  }
}
```

## Rejection law

The receipt engine blocks:

- fixture, sandbox, test, mock, demo, unpaid or draft evidence;
- malformed or future transaction timestamps;
- wrong product, price, currency, status or contributor;
- non-reconciling creator payout amounts;
- invalid 70/30 payout split;
- duplicate provider/order/payout identities;
- same provider receipt ID replayed with changed content;
- ledger metadata whose KC ID or SHA-256 no longer matches its source receipt.

An exact replay is a no-op and returns `REPLAY`. It does not create a second receipt or a second issue-closure event.

## Owner-only closure workflow

Use **Actions → Ingest External Economic Receipt → Run workflow** only after a real external provider transaction exists.

The workflow is restricted to the repository owner and requires explicit confirmation that the transaction is real and the raw provider evidence is preserved outside GitHub.

Canonical sequence:

`owner confirmation → pre-ledger validation → source receipt validation → idempotency/collision gate → KC metadata derivation → ledger mutation → full APWA build → .NET gateway build → exact canonical commit → closure receipt artifact → issue close`

Only the affected ledger file is staged. The workflow cannot use transaction transport as authority for any other Hub mutation.

## Local / CI proof

```bash
npm run validate:receipts
npm run test:receipts
npm run build
```

`npm run build` includes both external-receipt gates before TypeScript/Vite compilation. The repository's main `Validate Hub` workflow additionally builds the .NET 10 rigid gateway.

## Truth boundary

`VALIDATED METADATA != PAYMENT CREATION`

`KC RECEIPT != PROVIDER AUTHORITY`

`WORKFLOW DISPATCH != ECONOMIC EVENT`

The repository can make ingestion deterministic, durable and auditable. It cannot manufacture the first completed order or paid creator payout. #7 or #8 may close only after that corresponding external-world event exists and passes this membrane.
