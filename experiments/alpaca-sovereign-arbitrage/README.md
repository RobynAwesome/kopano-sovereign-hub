# Alpaca Sovereign Arbitrage — Hackathon Experiment

**State:** `WORKING`  
**Competition:** Alpaca AI Trading Agents Hackathon, 28 Aug–4 Sep 2026  
**Execution target:** dedicated Alpaca competition **paper** account  
**Issue:** `kopano-sovereign-hub#35`

This directory is an isolated downstream experiment. It consumes KPGS/Kopano Context governance; it does not promote itself into constitutional source-of-truth status.

```text
I_AM_STATELESS_RENTER_NOT_LANDLORD
REALITY_STATE > INDEX_STATE

Market observation
  -> LLM thesis/proposal
  -> deterministic risk engine
  -> RTC execution gate
  -> Alpaca MCP V2
  -> paper account
  -> receipt + P&L telemetry
```

## Strategy thesis

The POC harvests option premium using **defined-risk credit spreads and iron condors** on a small, liquid universe (`SPY`, `QQQ`, `AAPL`, `NVDA`). The model can propose a structure; the model cannot bypass deterministic gates.

The initial policy preserves the source brief's 7–21 DTE entry window but corrects its self-contradictory “exit at 21 DTE” rule. Positions are instead profit-taken at 50% of maximum credit or forced toward closure at 5 DTE.

The source brief also mixed **IV Rank** with **IV Percentile**. Because Alpaca MCP exposes current IV/Greeks but not a ready 52-week IV-rank series, the first executable volatility gate is `ATM IV / 20-day realized volatility >= 1.15`. Historical IV percentile becomes mandatory only after the local observation ledger has enough history.

## Hard gates

- paper account only;
- competition starting equity must be exactly `$100,000`;
- options structures only;
- no naked short option exposure;
- maximum four legs;
- maximum loss per structure <= 3% of current equity;
- aggregate open defined risk <= 12% of current equity (new conservative KPGS local guardrail);
- reject new risk at >= 5% drawdown from the competition start;
- liquidity, DTE, delta, and volatility-premium gates must pass;
- only `APPROVE` may become an execution intent.

## Canonical Alpaca MCP V2 boundary

The code uses current Alpaca MCP V2 names such as:

- `get_account_info`
- `get_all_positions`
- `get_stock_bars`
- `get_option_chain`
- `get_option_snapshot`
- `get_option_contracts`
- `place_option_order`
- `replace_order_by_id`
- `cancel_order_by_id`
- `close_position`

Generic V1/hand-wavy names such as `place_order` are intentionally rejected by the contract test.

## PR run

1. **PR-1 — strategy kernel + proof harness**: this tranche.
2. **PR-2 — KPGS runtime wiring**: experiment registry, MCP adapter, telemetry journal, root validation hook.
3. **PR-3 — competition paper execution**: secret-backed connection, exact account checks, actual multi-leg paper order and receipts.

No test fixture, README, or simulated candidate is evidence of trading profitability. `PR-3` stays `EXTERNAL_GATE` until the competition account produces real receipts.

## Local validation

```bash
node --test experiments/alpaca-sovereign-arbitrage/tests/*.test.mjs
```
