# NOW — Alpaca Sovereign Arbitrage

## PRE-SEED

- Date: 2026-08-28 SAST
- Parent issue: `RobynAwesome/kopano-sovereign-hub#35`
- Branch: `hackathon/alpaca-sovereign-arbitrage`
- Constitutional authority remains `RobynAwesome/Introduction-to-MCP` MAIN-BRAIN.
- Runtime landlord for this experiment: `RobynAwesome/kopano-sovereign-hub`.
- Source strategy brief: `Kopano Context x Alpaca MCP: Sovereign Arbitrage Strategy Brief`.
- Competition truth checked against current Alpaca/lablab materials before code.

## CURRENT TRANCHE

`PR-1 = strategy kernel + deterministic proof harness`

Working law:

```text
OBSERVE -> PROPOSE -> VALIDATE -> APPROVE|HOLD|REJECT -> PREVIEW
```

No brokerage order may be submitted in PR-1.

## CORRECTIONS LOCKED

1. Current Alpaca MCP V2 tool names replace generic tool labels in the source brief.
2. Entry remains 7–21 DTE; mandatory close is 5 DTE, not 21 DTE.
3. Volatility gate uses IV / realized-volatility ratio immediately; historical IV percentile is proof-gated until enough observations exist.
4. Paper-only boundary is explicit in runtime configuration.

## NEXT

- PR-2: registry + MCP adapter + evidence journal.
- PR-3: dedicated $100k competition account + actual paper execution receipts.
