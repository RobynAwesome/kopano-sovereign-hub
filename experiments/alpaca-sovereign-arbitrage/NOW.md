# NOW — Alpaca Sovereign Arbitrage

## STATE

- Date: 2026-08-30 SAST
- Parent execution issue: `RobynAwesome/kopano-sovereign-hub#35`
- LEFA bridge issue: `RobynAwesome/kopano-sovereign-hub#41`
- PR-1 merged: `261553de8b7335e22abbf2806ccaa032d8d59161`
- PR-2 merged: `9a521a88a6203194b38d2d8fb55ccbe4da66fecc`
- PR-3 merged: `97f62dcece34a8e4fb21311b1dd1c545fd1e7836`
- MCP mitigation merged: `9e2732f297f8ffdc1a4b9e318337e28abadc961b`
- Sunday universe evidence merged: `c3dd4bf42735b465e213c289663109c2b4fec7c6`
- LEFA POC-0 truth boundary merged in `RobynAwesome/Lefa-ai-google-stitch` as `1ad3e9a871c079a8ea7ba84a88a47daab87751db`.
- Current branch: `feat/lefa-alpaca-status-bridge`
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

- Paper-only is a hard invariant.
- Wrong competition start equity is rejected.
- Level 2 options capability cannot pass a spreads/iron-condor execution gate.
- Missing option data or credentials produces HOLD.
- External receipt promotion requires an actual Alpaca provider order identifier.
- MCP remains preferred for multi-leg execution.
- A verified REST fallback may target only `https://paper-api.alpaca.markets/v2/orders`.
- Live Alpaca execution endpoints are not admissible in this competition lane.

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

Upstream `alpacahq/alpaca-mcp-server#97` and fix PR `#107` remain external upstream concerns; they are no longer a single point of failure for the Sovereign lane.

## MARKET-DATA BASELINE — 2026-08-30

Connected Alpaca market-data observation proved options contracts, quotes, IV and Greeks are retrievable for the governed universe. Friday-close volatility screen:

```text
SPY   -> REJECT
QQQ   -> REJECT
NVDA  -> REJECT
AAPL  -> WATCH_REFRESH_ONLY
```

AAPL Friday reference structure was `295P / 305P / 335C / 345C`, but it is stale continuity evidence only. No Sunday observation is reusable as Monday execution permission.

## LEFA PRESENTATION BOUNDARY

`RobynAwesome/Lefa-ai-google-stitch` is now explicitly downstream of Sovereign truth:

- browser holds no Alpaca credentials;
- live-trading selection removed;
- simulated connection success removed;
- canonical decision receipt type: `kopano.alpaca.decision-receipt.v1`;
- bridge status type: `kopano.lefa.sovereign-bridge-status.v1`;
- browser execution authority: `BACKEND_ONLY`;
- invalid/unreachable/unconfigured bridge => disconnected / HOLD.

Issue #41 adds the corresponding read-only provider-status endpoint to this repository. It may verify request-time paper-account reachability but must not expose account ID, cash, equity, buying power, positions or secrets.

## STILL EXTERNAL_GATE

The repository cannot manufacture these facts:

1. actual competition Alpaca server credentials/session;
2. fresh competition paper account snapshot;
3. immutable first-connect start-equity receipt exactly `$100,000`;
4. Level 3 options capability on the competition account;
5. current positions and portfolio defined risk;
6. fresh post-open option quotes/Greeks for a currently eligible proposal;
7. one approved execution transport in the actual competition runtime;
8. accepted paper order ID;
9. post-submit order/position reconciliation;
10. P&L telemetry.

## NEXT EXECUTION

1. Validate and merge Issue #41 only on exact-head Hub CI.
2. Configure `LEFA_ALLOWED_ORIGIN`, `ALPACA_API_KEY`, and `ALPACA_SECRET_KEY` in the deployed Sovereign backend — never in the LEFA browser.
3. Point LEFA `VITE_LEFA_SOVEREIGN_STATUS_URL` at the deployed read-only status endpoint.
4. Verify the provider boundary; HOLD if any server credential/provider/account gate fails.
5. Add a canonical persisted decision-receipt read path before LEFA renders live Ledger history.
6. After U.S. market open, regenerate the full market/risk gate from fresh reality.

`REALITY_STATE > INDEX_STATE`
`RECEIPT OR HOLD`
