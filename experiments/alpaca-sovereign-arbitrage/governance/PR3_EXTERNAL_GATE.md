# PR-3 External Gate Runbook

This runbook governs the actual Alpaca competition paper environment. Secrets stay outside Git and logs.

## 1. Bind the competition environment

Required runtime facts:

```text
ALPACA_PAPER_TRADE=true
credentials_present=true
```

Never commit API keys or secret keys. The governance layer may record only credential presence and provider receipts, never secret values.

## 2. Rehydrate broker truth before trading

Use Alpaca account truth before any cached state:

1. `get_account_info`
2. `get_all_positions`
3. `get_orders`
4. `get_clock`

Record a first-connect account receipt before any order. The immutable competition starting-equity value must be exactly **$100,000** or execution is rejected.

## 3. Prove Level 3 + option data

The strategy requires spreads / iron condors, so the normalized account capability must show options trading level **3 or greater**. Confirm option chain, quotes, IV and Greeks are obtainable for at least one governed underlying before proposal generation.

## 4. Select one governed execution transport

### Preferred: Alpaca MCP

Prove the active MCP bridge preserves `legs[]` as an array. Do not infer this from the server schema alone. Alpaca MCP issue #97 remains open as of 2026-08-30 and documents client bridges that stringify the multi-leg array.

```text
array survives client -> MCP boundary  => MCP_MLEG_CAPABLE -> ALPACA_MCP
legs rejected as serialized string     => MCP_MLEG_FAIL
unclear/no inspectable result           => MCP_MLEG_UNKNOWN
```

Fix PR #107 exists but remains open. Until the fix is merged and shipped, it is not evidence that the active runtime has the repair.

### Fallback: direct Alpaca paper Trading API

Issue #97 records that the identical multi-leg payload succeeds when POSTed directly to Alpaca's paper orders endpoint. When MCP is `FAIL` or `UNKNOWN`, the runtime may use the fallback only if all of the following are true:

```text
restFallback.enabled=true
restFallback.paper_only=true
restFallback.endpoint=https://paper-api.alpaca.markets/v2/orders
restFallback.upstream_workaround_verified=true
```

The live endpoint `https://api.alpaca.markets/v2/orders` is forbidden for this hackathon lane and must produce `REJECT`.

The REST call may reference credentials only through runtime environment variables (`ALPACA_API_KEY`, `ALPACA_SECRET_KEY`). Secret values must not enter Git, logs, KC receipts, or tool-intent evidence.

## 5. Run one governed paper order

Only after environment readiness, execution-transport selection, and deterministic risk approval are all green:

1. Observe market state.
2. Generate candidate structure.
3. Run deterministic risk engine.
4. Require `APPROVE`.
5. Select `ALPACA_MCP` when the multi-leg bridge is healthy; otherwise select the verified `ALPACA_PAPER_REST` fallback.
6. Submit the same governed `mleg` payload with a real `legs[]` array to the **paper** account.
7. Capture the returned Alpaca order identifier and status.
8. Emit a KC external receipt binding the provider ID to the observation, proposal, risk decision and transport/tool intent.

## 6. Rehydrate again

After submission, query orders and positions again. The post-submit broker state must reconcile with the provider receipt. A provider ID without matching broker state remains incomplete evidence.

## 7. Promotion rule

Execution proof requires inspectable receipts for:

- competition account start equity;
- Level 3 capability;
- option market data;
- approved execution transport (`ALPACA_MCP` or verified `ALPACA_PAPER_REST`);
- at least one accepted paper order ID;
- post-submit order/position reconciliation.

Positive P&L is never inferred from an accepted order; P&L telemetry is a separate subsequent receipt stream.

## Upstream watch

Continue tracking:

- `alpacahq/alpaca-mcp-server#97`
- `alpacahq/alpaca-mcp-server#107`
- published Alpaca MCP package/version metadata

When a fix is merged and actually shipped, re-run the client-specific MCP capability probe before removing the fallback. A source-code merge alone is not runtime proof.
