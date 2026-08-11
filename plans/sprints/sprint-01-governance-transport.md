# Sprint 01 — Governance Transport

## Objective

Prove that every integration can be described and governed before execution.

## PR2 — Universal Sovereign Adapter Contract

### Hypothesis
A provider-neutral typed contract can make identity, capability, scope, consent, trust and revocation explicit enough for KC to govern integrations without provider-specific logic leaking into the shell.

### In scope
- adapter declaration;
- capability declaration;
- scope model;
- consent state;
- request envelope;
- KC decision envelope;
- execution receipt;
- revocation receipt;
- deterministic mock adapter for validation.

### Out of scope
- real OAuth credentials;
- Google/Microsoft/Spotify production calls;
- arbitrary Chrome/Edge extension execution;
- .NET gateway implementation;
- public-service delivery claims.

### Acceptance path

```text
Adapter declares capability
        ↓
User/KC request carries explicit scopes
        ↓
KC evaluates trust + requested operations
        ↓
ALLOW / REVIEW / BLOCK
        ↓
Bounded mock execution
        ↓
Receipt emitted
        ↓
Capability can be revoked
        ↓
Revocation receipt emitted
```

### Validation cases
1. First-party read capability -> ALLOW.
2. External read capability with explicit consent -> REVIEW until gateway proof exists.
3. External write capability without consent -> BLOCK.
4. Revoked capability -> BLOCK regardless of prior receipt.
5. Every accepted execution emits a receipt with adapter, capability, scopes, decision and timestamp.

## PR3 — First rigid gateway proof
Begins only after PR2 contract and tests survive review.
