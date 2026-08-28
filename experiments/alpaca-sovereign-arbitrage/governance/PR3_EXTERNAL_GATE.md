# PR-3 External Gate Runbook

This runbook begins only when the actual Alpaca competition paper environment is available. Secrets stay outside Git and logs.

## 1. Bind the competition environment

Required runtime facts:

```text
ALPACA_PAPER_TRADE=true
credentials_present=true
```

Never commit API keys or secret keys. The runtime should expose only boolean credential presence to the governance layer.

## 2. Rehydrate broker truth before trading

Use the current Alpaca MCP V2 observation boundary:

1. `get_account_info`
2. `get_all_positions`
3. `get_orders`
4. `get_clock`

Record a first-connect account receipt before any order. The immutable competition starting-equity value must be exactly **$100,000** or execution is rejected.

## 3. Prove Level 3 + option data

The strategy requires spreads / iron condors, so the normalized account capability must show options trading level **3 or greater**. Confirm option chain, quotes, IV and Greeks are obtainable for at least one governed underlying before proposal generation.

## 4. Prove the active MCP bridge preserves `legs[]`

Do not infer this from server documentation alone. Current Alpaca MCP issue #97 shows a client bridge can expose a list schema yet transmit the value as a string.

Use a controlled negative capability probe before any valid trade: send an `mleg` payload whose option symbols are deliberately non-tradable probe identifiers. PASS requires the error to occur *after* list parsing (for example, provider/asset validation), while a list-type/Pydantic serialization failure is `MCP_MLEG_FAIL`. The probe must be incapable of creating a valid order.

```text
array survives client -> MCP boundary  => MCP_MLEG_CAPABLE
legs rejected as serialized string     => MCP_MLEG_FAIL
unclear/no inspectable result           => MCP_MLEG_UNKNOWN
```

## 5. Run one governed paper order

Only after all readiness gates are green:

1. Observe market state.
2. Generate candidate structure.
3. Run deterministic risk engine.
4. Require `APPROVE`.
5. Build `place_option_order` with `order_class=mleg` and a real `legs[]` array.
6. Submit to the **paper** account.
7. Capture the returned Alpaca order identifier and status.
8. Emit a KC external receipt binding the provider ID to the observation, proposal, risk decision and tool intent.

## 6. Rehydrate again

After submission, query orders and positions again. The post-submit broker state must reconcile with the provider receipt. A provider ID without matching broker state remains incomplete evidence.

## 7. Promotion rule

PR-3 may move out of draft only when the repository can reference inspectable receipts for:

- competition account start equity;
- Level 3 capability;
- option market data;
- MCP multi-leg capability;
- at least one accepted paper order ID;
- post-submit order/position reconciliation.

Positive P&L is never inferred from an accepted order; P&L telemetry is a separate subsequent receipt stream.
