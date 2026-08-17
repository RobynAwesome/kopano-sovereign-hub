# Kopano Sovereign Hub

Kopano Sovereign Hub is the governed distribution shell for first-party Kopano Labs and AMA-PHU Entertainment surfaces.

## Consumer doors

READ / PLAY / WATCH / LISTEN / OWN / CREATE

The product rule is simple: **world first, machinery underneath**. KC governance, adapter state, runtime telemetry and proof receipts remain available through progressive disclosure rather than dominating the consumer surface.

## Current proof state

- Sprint 01 governance transport — complete.
- Sprint 02 canonical assets + visual shell — complete.
- Sprint 03 Sovereign Studio — complete POC.
- Sprint 04 Entertainment Distribution — complete bounded POC.
- Sprint 05 Commerce / OWN — code complete; `EXTERNAL_GATE` until one real completed production-provider order receipt is ingested.
- Sprint 06 CREATE + EARN — code complete; `EXTERNAL_GATE` until one real paid production-provider payout validates the governed revenue split.
- Sprint 07 Public Service Delivery — complete bounded POC; no impact claim without observed user telemetry.

External economic evidence is validated by `src/poc/externalReceipts.ts`. Fixtures, sandbox objects, mock receipts, unpaid invoices and fabricated IDs cannot close Sprint 05 or Sprint 06. See `docs/external-receipt-ingestion.md`.

## Validation

```bash
npm install
npm run build
dotnet build gateway/Kopano.Sovereign.Gateway/Kopano.Sovereign.Gateway.csproj --configuration Release
```

GitHub Actions also exercises the live credentialless YouTube public-feed transport when runners are available.
