# NOW — Alpaca Sovereign Arbitrage

## STATE

- Date: 2026-08-28 SAST
- Parent issue: `RobynAwesome/kopano-sovereign-hub#35`
- PR-1 merged: `261553de8b7335e22abbf2806ccaa032d8d59161`
- PR-2 branch: `hackathon/alpaca-runtime-wiring`
- Constitutional authority remains `RobynAwesome/Introduction-to-MCP` MAIN-BRAIN.
- Runtime landlord: `RobynAwesome/kopano-sovereign-hub`.

## PROVEN LOCALLY

```text
OBSERVE -> PROPOSE -> VALIDATE -> APPROVE|HOLD|REJECT -> MCP_INTENT -> RECEIPT
```

- Strategy/risk kernel is deterministic.
- Alpaca MCP V2 tool names are bounded.
- Broker rehydration plan prioritizes account/positions/orders over cached local memory.
- KC decision receipts are content-hashed and separate from Alpaca provider order receipts.
- Combined test suite: 20/20 PASS.

## MULTI-LEG TRANSPORT GATE

Current Alpaca MCP Server issue #97 reports that some MCP clients can serialize the multi-leg `legs[]` array as a string. Complex option execution therefore requires a runtime probe:

```text
MCP_MLEG_UNKNOWN -> HOLD
MCP_MLEG_FAIL    -> HOLD
MCP_MLEG_CAPABLE -> eligible for risk-approved paper execution
```

Server schema alone is not proof that the active client bridge preserves the payload.

## STILL EXTERNAL_GATE

- dedicated competition paper account connected;
- recorded competition start equity exactly $100,000;
- options permission/data access;
- successful multi-leg capability round trip through the actual client;
- accepted/filled paper order;
- P&L telemetry.

## NEXT — PR-3

Connect the actual competition paper environment, run read-only rehydration first, prove the multi-leg bridge, then permit one deterministic risk-approved paper order and capture its external receipt. No live-money lane belongs in this hackathon runtime.
