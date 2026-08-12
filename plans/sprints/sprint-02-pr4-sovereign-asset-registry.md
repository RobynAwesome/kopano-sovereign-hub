# Sprint 02 / PR4 — Sovereign Asset Registry

## Goal

Create the canonical asset membrane before the Hub becomes media-first in PR5.

## State transition

```text
chat/file evidence
  -> fingerprint
  -> classification
  -> ownership/IP namespace
  -> approval
  -> governed ingest
  -> derivative lineage
  -> declared distribution surface
```

PR4 intentionally separates **evidence existence** from **production availability**.

## Asset states

- `evidence-only` — fingerprinted evidence exists, but the binary is not claimed to live in governed Hub storage.
- `ingested` — canonical original has been placed into governed storage and matched against its fingerprint.
- `derived` — approved derivative has a declared parent asset.

## Approval states

- `candidate` — may be evaluated but cannot ship.
- `approved` — eligible for distribution only after ingest/derivation and confirmed classification.
- `rejected` — cannot ship.
- `reference-only` — interaction/design evidence; never a production asset.

## Initial evidence receipts

### Kopano Labs primary mark

- source: `1000153842.png`
- measured binary: JPEG despite `.png` filename
- dimensions: 1536×1536
- bytes: 127434
- SHA-256: `b113f26d72ce77f915b49bf5ab6528205409e16323e39c7b070ba3820416e6ff`
- state: candidate + evidence-only

The encoding/extension mismatch must be normalized during canonical ingest without discarding the original fingerprint.

### Current Hub mobile baseline

- source: `Screenshot_2026-08-11-17-27-06-072_com.microsoft.emmx.jpg`
- dimensions: 674×1536
- bytes: 161505
- SHA-256: `8057ca4b0d29f23800127ee246f21a948c62a2cdd53442b978cd334de4e4a263`
- state: reference-only product evidence

Used by PR5 to prove that the existing shell is functional but too system-dense for the consumer journey.

### Game/workstation references

The MSN/Wolfram screenshots are fingerprinted as `reference-only` evidence. Their interaction principle may inform architecture; their UI/assets may not be redistributed through the Hub.

Core principle:

> Deep machinery underneath; simple action above.

### Project: JENNIFER companion evidence

Three supplied 1408×768 PNGs are fingerprinted and queued under a **provisional** `project-jennifer` classification. They cannot become canonical until ownership/namespace is explicitly confirmed and the binaries are ingested.

## Runtime contract

`src/assets/contract.ts` defines asset identity, ownership, lineage, approval, fingerprint, media metadata and distribution surfaces.

`src/assets/registry.ts` records the evidence-backed seed registry.

`src/assets/validation.ts` blocks:

- malformed SHA-256 fingerprints;
- missing visual dimensions;
- distribution of reference-only evidence;
- orphan derivatives;
- approved assets with provisional classification;
- distribution before approval + confirmed classification + ingest/derivation.

## PR4 acceptance gate

- [x] canonical asset contract exists
- [x] evidence-backed seed registry exists
- [x] Kopano Labs mark fingerprint recorded
- [x] current Hub baseline fingerprint recorded
- [x] third-party interaction references isolated as non-distributable
- [x] Project: JENNIFER evidence queued provisionally
- [x] validation functions encode no-FOC distribution rules
- [ ] CI passes TypeScript/Vite + existing .NET gateway build
- [ ] merge PR4

## Explicit non-claims

PR4 does **not** claim the image binaries are stored in the repository or production CDN. That transition requires the separate ingestion receipt tracked in issue #14.
