# Alpaca Sovereign Arbitrage — Hackathon Experiment

**State:** `BUILD · PR-3 EXTERNAL_GATE`  
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
  -> competition readiness gate
  -> MCP multi-leg capability gate
  -> Alpaca MCP V2 paper execution
  -> provider receipt + P&L telemetry
```

## Strategy thesis

The POC harvests option premium using **defined-risk credit spreads and iron condors** on a small, liquid universe (`SPY`, `QQQ`, `AAPL`, `NVDA`). The model can propose a structure; the model cannot bypass deterministic gates.

The initial policy preserves the source brief's 7–21 DTE entry window but corrects its self-contradictory “exit at 21 DTE” rule. Positions are instead profit-taken at 50% of maximum credit or forced toward closure at 5 DTE.

The source brief also mixed **IV Rank** with **IV Percentile**. Because Alpaca MCP exposes current IV/Greeks but not a ready 52-week IV-rank series, the first executable volatility gate is `ATM IV / 20-day realized volatility >= 1.15`. Historical IV percentile becomes mandatory only after the local observation ledger has enough history.

## Hard gates

- paper account only;
- competition starting equity receipt exactly `$100,000`;
- Alpaca Level 3 options capability for spreads / iron condors;
- option chain, quote, IV and Greeks data available;
- MCP client must prove that complex-order `legs[]` survives as an array;
- options structures only;
- no naked short option exposure;
- maximum four legs;
- maximum loss per structure <= 3% of current equity;
- aggregate open defined risk <= 12% of current equity;
- reject new risk at >= 5% drawdown from competition start;
- liquidity, DTE, delta, and volatility-premium gates must pass;
- only `APPROVE` plus `READY` may become a provider-ready execution intent.

## Canonical Alpaca MCP V2 boundary

The code uses current Alpaca MCP V2 names such as:

- `get_account_info`
- `get_all_positions`
- `get_orders`
- `get_clock`
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

1. **PR-1 — strategy kernel + proof harness:** merged as `261553de8b7335e22abbf2806ccaa032d8d59161`.
2. **PR-2 — KPGS runtime wiring:** merged as `9a521a88a6203194b38d2d8fb55ccbe4da66fecc`.
3. **PR-3 — competition paper execution:** draft / external gate until actual Alpaca receipts exist.

Current local deterministic proof: **30/30 tests passing**.

No test fixture, README, mocked provider object or simulated candidate is evidence of trading profitability. See `governance/PR3_EXTERNAL_GATE.md` for the exact closure protocol.

## Validation

```bash
npm run test:alpaca
```
