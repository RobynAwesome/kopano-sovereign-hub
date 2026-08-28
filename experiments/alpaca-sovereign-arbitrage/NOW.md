# NOW — Alpaca Sovereign Arbitrage

## STATE

- Date: 2026-08-28 SAST
- Parent issue: `RobynAwesome/kopano-sovereign-hub#35`
- PR-1 merged: `261553de8b7335e22abbf2806ccaa032d8d59161`
- PR-2 merged: `9a521a88a6203194b38d2d8fb55ccbe4da66fecc`
- PR-3 branch: `hackathon/alpaca-competition-execution`
- Registry state: `BUILD`
- Constitutional authority remains `RobynAwesome/Introduction-to-MCP` MAIN-BRAIN.

## PROVEN IN REPOSITORY

```text
OBSERVE
  -> PROPOSE
  -> DETERMINISTIC_RISK
  -> APPROVE|HOLD|REJECT
  -> ENVIRONMENT_READINESS
  -> MCP_MLEG_CAPABILITY
  -> PROVIDER_READY_CALL
  -> RECEIPT_CONTRACT
```

- Combined suite: **30/30 PASS**.
- Paper-only is a hard invariant.
- Wrong competition start equity is rejected.
- Level 2 options capability cannot pass a spreads/iron-condor execution gate.
- Missing option data or credentials produces HOLD.
- Unknown/failed MCP `legs[]` transport produces HOLD.
- A provider-ready call is produced only after environment readiness and deterministic risk approval.
- External receipt promotion requires an actual Alpaca provider order identifier.

## EXTERNAL_GATE

The repository cannot manufacture these facts:

1. actual competition Alpaca credentials/session;
2. fresh paper account snapshot;
3. immutable first-connect start-equity receipt exactly `$100,000`;
4. Level 3 options capability on the competition account;
5. options chain/quote/IV/Greeks access;
6. client-specific MCP multi-leg array round trip;
7. accepted paper order ID;
8. post-submit order/position reconciliation;
9. P&L telemetry.

## NEXT EXECUTION

Follow `governance/PR3_EXTERNAL_GATE.md`. PR-3 remains draft until inspectable external receipts close the first eight gates. P&L then becomes the continuing competition evidence stream, not a prerequisite fabricated at merge time.
