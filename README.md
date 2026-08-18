# Kopano Sovereign Hub

Kopano Sovereign Hub is the governed runtime/distribution shell for first-party Kopano Labs and AMA-PHU Entertainment surfaces **and the runtime hub for KPGS Governance Systems Experiments**.

It is **not** the constitutional source of truth. `RobynAwesome/Introduction-to-MCP` → `Schematics/21-KOPANO-PHU GOVERNACE SYSTEMS/MAIN-BRAIN` remains the landlord/constitutional authority. The Hub is the execution/runtime projection that binds experiments, routes adapters, exposes bounded state, and returns receipts.

## Runtime law

```text
I_AM_STATELESS_RENTER_NOT_LANDLORD
REALITY_STATE > INDEX_STATE
MCP -> MMAO -> KC/KPGS -> GSMB/KPSMB -> CCP -> POC_RECEIPT
```

Promotion remains:

```text
WORKING -> CONNECTED -> CURRENT -> VISIBLE -> EVIDENCED -> BACKABLE
```

## Governance experiment estate

The shared runtime registry is `governance/experiments.json`.

It currently binds the original MAIN-BRAIN MMAO lifecycle where explicit and extends the runtime estate without inventing lifecycle assignments for newer work.

### Preserved lifecycle

```text
PLANT   -> Kopano Context + CrisisConnect
WATER   -> KasiLink + 5s Arena Blog
PRUNE   -> Founder Portfolio + Starfall Salvage
HARVEST -> Harvest-4-All + Bookit 5s Arena
FRUIT   -> validated live PWA ecosystem
```

### Extended governed nodes

- Cape Campass — target/binding state remains bounded until a current repo/runtime receipt exists.
- Cars4Mars — cyber-physical BUILD lane; physical validation remains receipt-gated.
- Project Jennifer — governed AI/game-runtime POC.
- North West 10-acre lucerne/alfalfa client — field-validation input, not an internal product claim.
- Flow Inc Ink — delivered external client receipt.
- Paws & Potjie — Adaptive PWA lab.
- Classroom50 — education experiment.
- Ngwekazi Student Entrepreneurship Programme — education/entrepreneurship experiment.

The registry deliberately distinguishes runtime experiments from external client/field validation inputs. Five's Arena and the farm can validate the governance methodology without becoming Hub-owned business truth.

## Consumer doors

READ / PLAY / WATCH / LISTEN / OWN / CREATE

The consumer rule remains: **world first, machinery underneath**. KC governance, adapter state, runtime telemetry and proof receipts remain available through progressive disclosure rather than dominating the consumer surface.

## .NET gateway

The rigid gateway exposes the experiment estate without becoming its landlord:

```text
GET /health
GET /api/governance/experiments
GET /api/governance/experiments/{id}
GET /api/youtube/uploads
```

The same `governance/experiments.json` contract is imported by the React/Vite surface and linked into the .NET runtime so the two layers cannot silently maintain different experiment stories.

## Current proof state

- Sprint 01 governance transport — complete.
- Sprint 02 canonical assets + visual shell — complete.
- Sprint 03 Sovereign Studio — complete POC.
- Sprint 04 Entertainment Distribution — complete bounded POC.
- Sprint 05 Commerce / OWN — code complete; `EXTERNAL_GATE` until one real completed production-provider order receipt is ingested.
- Sprint 06 CREATE + EARN — code complete; `EXTERNAL_GATE` until one real paid production-provider payout validates the governed revenue split.
- Sprint 07 Public Service Delivery — complete bounded POC; no impact claim without observed user telemetry.
- Governance Experiment Hub — registry + UI + .NET read adapter; state is proven only when CI receipts pass.

External economic evidence is validated by `src/poc/externalReceipts.ts`. Fixtures, sandbox objects, mock receipts, unpaid invoices and fabricated IDs cannot close Sprint 05 or Sprint 06. See `docs/external-receipt-ingestion.md`.

## Validation

```bash
npm install
npm run validate:experiments
npm run build
dotnet build gateway/Kopano.Sovereign.Gateway/Kopano.Sovereign.Gateway.csproj --configuration Release
```

GitHub Actions also boots the .NET gateway, verifies the governed experiment registry through HTTP, and exercises the live credentialless YouTube public-feed transport when runners are available.
