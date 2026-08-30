# NOW — Alpaca Sovereign Arbitrage

## STATE

- Date: 2026-08-30 SAST
- Parent issue: `RobynAwesome/kopano-sovereign-hub#35`
- PR-1 merged: `261553de8b7335e22abbf2806ccaa032d8d59161`
- PR-2 merged: `9a521a88a6203194b38d2d8fb55ccbe4da66fecc`
- PR-3 merged: `97f62dcece34a8e4fb21311b1dd1c545fd1e7836`
- Current mitigation branch: `fix/alpaca-mleg-rest-fallback`
- Registry state: `BUILD`
- Constitutional authority remains `RobynAwesome/Introduction-to-MCP` MAIN-BRAIN.

## PROVEN IN REPOSITORY

```text
OBSERVE
  -> PROPOSE
  -> DETERMINISTIC_RISK
  -> APPROVE|HOLD|REJECT
  -> ENVIRONMENT_READINESS
  -> EXECUTION_TRANSPORT
  -> PROVIDER_READY_CALL
  -> RECEIPT_CONTRACT
```

- Baseline combined suite before transport mitigation: **30/30 PASS**.
- Paper-only is a hard invariant.
- Wrong competition start equity is rejected.
- Level 2 options capability cannot pass a spreads/iron-condor execution gate.
- Missing option data or credentials produces HOLD.
- External receipt promotion requires an actual Alpaca provider order identifier.

## UPSTREAM ALPACA MCP #97 — 2026-08-30

Current verified upstream state:

- `alpacahq/alpaca-mcp-server#97` remains **OPEN**.
- Fix PR `alpacahq/alpaca-mcp-server#107` remains **OPEN**.
- PR #107 implements JSON-string `legs` coercion, validation and regression tests, but an Alpaca maintainer requested that `legs` remain list-typed in the public MCP schema while string parsing happens internally.
- Repository metadata still advertises Alpaca MCP Server **2.2.0**.
- GitHub currently shows **no published releases** for the repository.
- Issue #97 itself records that posting the same multi-leg payload directly to `https://paper-api.alpaca.markets/v2/orders` succeeds, isolating the fault to the MCP client transport rather than Alpaca's paper Trading API.

Therefore upstream remediation is promising but **not yet promotable as a released MCP fix**.

## CURRENT TRANSPORT LAW

```text
MCP_MLEG_CAPABLE
  -> ALPACA_MCP

MCP_MLEG_FAIL|UNKNOWN
  + VERIFIED_PAPER_REST_FALLBACK
  + EXACT_PAPER_ENDPOINT
  -> ALPACA_PAPER_REST

anything else
  -> HOLD|REJECT
```

The fallback may only target:

`https://paper-api.alpaca.markets/v2/orders`

A live Alpaca orders endpoint is a hard reject. MCP remains preferred whenever the active bridge proves `legs[]` array transport.

## LOCAL MITIGATION PROOF

`transport-policy.mjs` standalone tests: **5/5 PASS** before repository write.

The follow-up branch adds integration coverage proving that the REST fallback can close only the transport gate; it cannot bypass paper mode, credentials, exact start equity, Level 3, option-data, deterministic risk approval, or provider receipt requirements.

## STILL EXTERNAL_GATE

The repository cannot manufacture these facts:

1. actual competition Alpaca credentials/session;
2. fresh paper account snapshot;
3. immutable first-connect start-equity receipt exactly `$100,000`;
4. Level 3 options capability on the competition account;
5. options chain/quote/IV/Greeks access;
6. one approved execution transport: healthy MCP multi-leg bridge **or** verified paper REST fallback;
7. accepted paper order ID;
8. post-submit order/position reconciliation;
9. P&L telemetry.

## NEXT EXECUTION

Validate and merge `fix/alpaca-mleg-rest-fallback` only if the complete Alpaca suite remains green. Then connect the actual competition paper environment and close the remaining external gates with inspectable Alpaca receipts.

`REALITY_STATE > INDEX_STATE`
`RECEIPT OR HOLD`
