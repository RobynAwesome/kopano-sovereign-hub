# Governed Universe Screen Receipt — 2026-08-30

**State:** `OBSERVATION_ONLY`  
**Universe:** `SPY`, `QQQ`, `AAPL`, `NVDA`  
**Market:** closed; latest option observations are from Friday 2026-08-28  
**Policy source:** `strategy.policy.json`

## Purpose

Run the same deterministic volatility-premium screen across the full governed universe using current connected Alpaca market data. This is a pre-market baseline, not an execution authorization.

Policy threshold:

```text
ATM implied volatility / annualized 20-day realized volatility >= 1.15
```

Realized volatility is calculated from the most recent 20 daily log returns and annualized with `sqrt(252)`.

## Results

| Symbol | Friday close | RV20 | Representative Sep 11 near-ATM IV | IV / RV | State |
|---|---:|---:|---:|---:|---|
| SPY | 769.28 | 10.38% | 10.85% | 1.045 | REJECT |
| QQQ | 716.44 | 18.17% | 16.22% | 0.893 | REJECT |
| AAPL | 319.58 | 18.91% | 25.47% | 1.346 | WATCH_REFRESH_ONLY |
| NVDA | 217.545 | 46.51% | 34.59% | 0.744 | REJECT |

### Interpretation

`SPY`, `QQQ`, and `NVDA` fail the governed volatility-premium threshold. They must not receive new premium-selling proposals from this observation.

`AAPL` is the only symbol whose Friday-close volatility premium clears the 1.15 threshold. That does **not** make it approved. It earns only a fresh-market-data review after the next open.

## AAPL short-leg diagnostics

Friday-close Sep 11 candidates inside the configured `|delta| = 0.15–0.20` band:

| Contract | Bid / Ask | Relative spread | Delta | IV | Open interest | Result |
|---|---:|---:|---:|---:|---:|---|
| AAPL 305P | 1.24 / 1.33 | ~7.00% | -0.1524 | 27.32% | 1,019 | PASS short-leg screen |
| AAPL 335C | 1.28 / 1.39 | ~8.24% | +0.1731 | 25.27% | 1,697 | PASS short-leg screen |

Policy limits are <=20% relative bid/ask spread and >=100 open interest per short leg, so both observed short legs pass those local market-data gates.

## AAPL defined-risk reference structure

Protective-leg observations close to the configured `|delta| ~= 0.05` target:

| Contract | Bid / Ask | Delta | Role |
|---|---:|---:|---|
| AAPL 295P | 0.38 / 0.49 | -0.0579 | long put wing reference |
| AAPL 345C | 0.36 / 0.48 | +0.0643 | long call wing reference |

Together with the 305P / 335C short candidates, this forms a symmetrical **10-point-wide** Friday-close iron-condor reference:

```text
long  295P
short 305P
short 335C
long  345C
```

Using conservative quote-side arithmetic only:

```text
put credit  ~= 1.24 - 0.49 = 0.75
call credit ~= 1.28 - 0.48 = 0.80
total       ~= 1.55 ($155)
max loss    ~= (10.00 - 1.55) * 100 = $845
```

This is a **reference structure, not an order**. The `$845` max-loss figure cannot satisfy the portfolio risk gate until current competition equity and existing open defined risk are obtained from a trading-capable Alpaca session. Fresh Monday quotes may materially change every number above.

## Why AAPL remains WATCH, not APPROVE

The following remain unresolved or stale:

1. market is closed and quotes/Greeks must be refreshed after 2026-08-31 09:30 ET;
2. competition account/session is not available through the connected market-data surface;
3. current equity and existing portfolio defined risk are unknown;
4. immutable competition starting-equity receipt is not available here;
5. Level 3 options entitlement is not available here;
6. the reference structure must be regenerated and repriced from fresh quotes;
7. execution transport capability must be proven in the actual trading session;
8. no provider order receipt exists.

Therefore:

```text
AAPL = WATCH_REFRESH_ONLY
SPY  = REJECT
QQQ  = REJECT
NVDA = REJECT
```

No Sunday observation may be reused as Monday execution permission.

## Next governed observation

After the market opens, refresh underlying snapshots, Sep 11 chain quotes/Greeks and 20-day bars. Re-run all entry gates from scratch. Only then may AAPL remain eligible for proposal construction.

`REALITY_STATE > INDEX_STATE`  
`RECEIPT OR HOLD`
