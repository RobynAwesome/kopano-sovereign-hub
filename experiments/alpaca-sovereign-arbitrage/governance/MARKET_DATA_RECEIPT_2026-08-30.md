# Market Data Receipt — 2026-08-30

**Experiment:** Alpaca Sovereign Arbitrage  
**Observation state:** `MARKET_DATA_PASS / TRADE_REJECT`  
**Source:** connected Alpaca market-data surface  
**Receipt time:** 2026-08-30 SAST

## Truth boundary

This receipt proves market-data availability only. It does **not** prove competition credentials, paper-account equity, Level 3 trading entitlement, positions, orders, fills, or P&L. The connected Alpaca surface used here exposes market data, not brokerage/account execution.

## Market clock

Observed Alpaca market clock:

```text
is_open=false
next_open=2026-08-31T09:30:00-04:00
next_close=2026-08-31T16:00:00-04:00
```

Therefore all option quotes below are the latest available closed-market observations and must be refreshed after the next market open before any execution decision.

## Governed policy referenced

From `strategy.policy.json`:

```text
DTE: 7–21
short |delta|: 0.15–0.20
ATM IV / 20d realized volatility: >= 1.15
max relative bid/ask spread: <= 0.20
minimum open interest per short leg: >= 100
```

## SPY underlying observation

Latest Friday 2026-08-28 IEX close / quote context:

```text
SPY close: 769.28
latest quote: 769.25 x 769.34
```

Twenty daily log returns ending 2026-08-28 produce annualized realized volatility of approximately:

```text
RV20 ~= 0.10383  (10.38%)
```

Near-ATM Sep 11 option IV around the 769 strike was approximately 10.75%–10.95%, giving a representative ATM IV near:

```text
ATM_IV ~= 0.1085
IV/RV  ~= 1.045
required >= 1.15
```

**Volatility-premium gate: REJECT.**

The strategy must not sell premium merely because the structure is liquid. Current SPY implied volatility does not exceed realized volatility by the governed minimum margin.

## Illustrative Sep 11 structure diagnostics

The following legs were inspected only to prove quote/Greek/liquidity availability. They are **not an approved order**.

| Leg | Bid / Ask | Delta | IV | Open interest | Gate note |
|---|---:|---:|---:|---:|---|
| SPY 753P short candidate | 1.66 / 1.72 | -0.1694 | 13.24% | 1,153 | short-delta + OI pass |
| SPY 748P protective candidate | 1.19 / 1.24 | -0.1233 | 14.12% | 4,256 | defined-risk wing reference |
| SPY 783C short candidate | 1.19 / 1.26 | +0.1732 | 9.51% | 1,326 | short-delta + OI pass |
| SPY 788C protective candidate | 0.50 / 0.55 | +0.0887 | 9.25% | 731 | defined-risk wing reference |

Short-leg relative spreads using `(ask-bid)/mid`:

```text
753P ~= 3.55%  <= 20% PASS
783C ~= 5.71%  <= 20% PASS
```

Both short legs exceed the minimum open-interest gate of 100.

For a purely illustrative 5-point-wing 1-lot condor using conservative quoted prices:

```text
put-side credit  ~= 1.66 - 1.24 = 0.42
call-side credit ~= 1.19 - 0.55 = 0.64
total credit     ~= 1.06 ($106)
max defined loss ~= (5.00 - 1.06) * 100 = $394
```

This max-loss arithmetic is structural only. It cannot satisfy the portfolio risk gate until current competition-account equity and existing defined risk are obtained from a trading-capable Alpaca session.

## Gate result

```text
MARKET_DATA_AVAILABLE       PASS
QUOTE_DATA                  PASS
IV_AND_GREEKS               PASS
DTE_WINDOW                  PASS
SHORT_DELTA                 PASS
SHORT_LEG_LIQUIDITY         PASS
VOLATILITY_PREMIUM          REJECT
ACCOUNT_TRUTH               EXTERNAL_GATE
LEVEL_3_ENTITLEMENT         EXTERNAL_GATE
ORDER_EXECUTION             EXTERNAL_GATE
```

### Decision

`REJECT NEW SPY PREMIUM STRUCTURE` on this observation.

Refresh market data after the 2026-08-31 open. A later observation may become eligible only if **all** deterministic gates pass; this receipt must not be reused as permission to trade.

`REALITY_STATE > INDEX_STATE`  
`RECEIPT OR HOLD`
