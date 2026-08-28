# PRE-SEED — PR-3 Competition Execution

## Base receipts

- PR-1 strategy kernel merged: `261553de8b7335e22abbf2806ccaa032d8d59161`.
- PR-2 runtime wiring merged: `9a521a88a6203194b38d2d8fb55ccbe4da66fecc`.
- Combined PR-1 + PR-2 test suite before PR-3: 20/20 PASS.
- Sovereign Hub registry state: `alpaca-sovereign-arbitrage = BUILD`.

## PR-3 law

PR-3 is the competition-execution tranche. It may merge only after external Alpaca evidence closes the gates that code cannot synthesize.

Required progression:

```text
PAPER_RUNTIME
  -> CREDENTIALS_PRESENT
  -> FRESH_ACCOUNT_SNAPSHOT
  -> IMMUTABLE_START_EQUITY_RECEIPT == $100,000
  -> OPTIONS_LEVEL >= 3
  -> OPTIONS_DATA_AVAILABLE
  -> MCP_MLEG_CAPABLE
  -> DETERMINISTIC_RISK_APPROVE
  -> place_option_order
  -> ALPACA_PROVIDER_ORDER_ID
  -> KC_EXTERNAL_RECEIPT
```

## Current external facts

- Alpaca Level 3 covers spreads and multi-leg strategies including iron condors.
- Alpaca paper trading supports testing multi-leg options.
- Current Alpaca MCP Server issue #97 reports that some MCP clients may serialize `legs[]` incorrectly; client transport must therefore be proven, not assumed.

## Forbidden closure

No fixture, mocked provider response, local hash, screenshot without inspectable account/order evidence, or conversational claim may close PR-3.
