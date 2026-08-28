# Sovereign Arbitrage — One-Page Hackathon Write-up (Working Draft)

## AI logic

Sovereign Arbitrage is a bounded AI options-trading agent built for Alpaca's paper environment. The agent separates **reasoning authority** from **execution authority**. An inference model observes the market, summarizes regime conditions, and proposes a defined-risk structure; a deterministic KPGS risk engine independently decides `APPROVE`, `HOLD`, or `REJECT`. Only an approved proposal can become an Alpaca execution intent. The first strategy lane uses liquid US underlyings and defined-risk **credit spreads / iron condors**, targeting short-option deltas around 0.15–0.20 and elevated implied volatility relative to 20-day realized volatility.

## Risk gates

The competition lane is hard-locked to paper trading. The runtime verifies that the competition account's recorded starting equity is exactly **$100,000**. New structures must have explicit maximum loss, protective long option legs, no more than four legs, and maximum loss no greater than **3% of current account equity**. Aggregate open defined risk is locally capped at 12% of equity. A **5% drawdown** from competition starting equity disables new risk. Liquidity gates reject wide option spreads and low open interest. The initial 7–21 DTE entry window uses a 5-DTE mandatory-close floor plus a 50%-of-max-credit profit target. The model cannot override any gate.

## Alpaca infrastructure

The runtime is designed around Alpaca MCP V2. Observation uses `get_account_info`, `get_all_positions`, `get_stock_bars`, `get_option_contracts`, `get_option_chain`, `get_option_snapshot`, and latest option quotes. Approved multi-leg options are routed through `place_option_order`; lifecycle operations use `replace_order_by_id`, `cancel_order_by_id`, and `close_position`. MCP is configured with `ALPACA_PAPER_TRADE=true` and bounded `account,trading,assets,stock-data,options-data` toolsets. On restart, the execution worker rehydrates account, order, and position state from Alpaca rather than trusting stale local memory.

## Governance / creativity

Kopano Context treats the LLM as a stateless renter: market claims, risk decisions, tool intents, fills, rejects, and P&L become receipts rather than conversational memory. This creates a visible evidence trail for both successful and rejected decisions. The hackathon therefore validates not only an options strategy but a reusable sovereign-agent pattern: **LLM proposal -> deterministic governance -> MCP execution -> external receipt**.

## Proof status

PR-1 proves the strategy/risk kernel with deterministic tests. PR-2 will prove runtime wiring and telemetry. Actual paper execution and P&L remain an external gate until the dedicated competition account is connected and receipts are captured.
