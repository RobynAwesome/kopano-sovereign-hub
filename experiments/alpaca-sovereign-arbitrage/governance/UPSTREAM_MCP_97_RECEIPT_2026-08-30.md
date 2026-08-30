# Upstream Receipt — Alpaca MCP #97 / PR #107

**Observed:** 2026-08-30 SAST  
**Scope:** multi-leg options transport for Alpaca Sovereign Arbitrage

## Current upstream state

- `alpacahq/alpaca-mcp-server#97` — **OPEN**.
- `alpacahq/alpaca-mcp-server#107` — **OPEN**.
- PR #107 proposes JSON-string `legs` coercion, local validation, regression tests, and corrected option `time_in_force` documentation.
- Alpaca maintainer feedback on 2026-08-24 requests that the public MCP schema keep `legs` typed as a list while string parsing is handled internally; it also requests explicit `day` / `gtc` wording and an actual-list regression test.
- Current repository package/server metadata advertises version **2.2.0**.
- GitHub's Releases page currently contains **no published releases**.

## Evidence relevant to our runtime

Issue #97 reports:

1. `place_option_order(order_class="mleg")` can receive a JSON-stringified `legs` value from some MCP clients and fail Pydantic list validation.
2. The same multi-leg payload succeeds when POSTed directly to:
   `https://paper-api.alpaca.markets/v2/orders`.
3. The reporter used a paper account with options Level 3.

This isolates the reported fault to the client → MCP invocation transport rather than the Alpaca paper Trading API contract.

## Governance decision

```text
UPSTREAM_FIX_EXISTS != RELEASED_RUNTIME_FIX
```

Therefore:

- prefer Alpaca MCP whenever the active bridge proves `legs[]` round-trip capability;
- retain the client-specific MCP probe;
- permit a direct **paper-only** REST fallback when MCP is `FAIL` or `UNKNOWN` and the fallback is explicitly verified/configured;
- reject any fallback targeting Alpaca's live orders endpoint;
- do not remove the fallback merely because PR #107 merges — require a shipped version plus a fresh client-specific capability receipt.

## Truth boundary

This receipt does **not** prove our competition credentials, account state, an accepted order, fill quality, or P&L. Those remain provider-receipt gates.

`REALITY_STATE > INDEX_STATE`
`RECEIPT OR HOLD`
