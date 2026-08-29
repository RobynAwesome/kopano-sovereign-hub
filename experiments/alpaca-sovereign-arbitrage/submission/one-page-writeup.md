# Sovereign Arbitrage — One-Page Hackathon Write-up (Working Draft)

## AI logic

Sovereign Arbitrage is a bounded AI options-trading agent for Alpaca's competition paper environment. The architecture separates **reasoning authority** from **execution authority**. An inference model observes market conditions and proposes a defined-risk structure; a deterministic KPGS risk engine independently returns `APPROVE`, `HOLD`, or `REJECT`. Only an approved proposal can advance. The first lane uses liquid US underlyings (`SPY`, `QQQ`, `AAPL`, `NVDA`) and defined-risk credit spreads / iron condors, targeting short deltas around 0.15–0.20 and implied volatility elevated versus 20-day realized volatility.

## Risk and readiness gates

The lane is hard-locked to paper trading. The competition starting-equity receipt must equal **$100,000**. Structures require explicit maximum loss, protective long legs, no more than four legs, <=3% maximum loss per structure, <=12% aggregate open defined risk, and a 5% drawdown kill switch. Liquidity, DTE, delta and volatility gates are deterministic. The runtime separately requires a fresh Alpaca account snapshot, Level 3 options capability, option chain/quote/IV/Greeks availability, and a proven multi-leg MCP transport before an order can become provider-ready.

## Alpaca infrastructure

The implementation targets Alpaca MCP V2. Broker truth is rehydrated with `get_account_info`, `get_all_positions`, `get_orders`, and `get_clock` before cached state is trusted. Market observation is bounded to Alpaca stock/options data tools. Approved complex orders use `place_option_order` with `order_class=mleg` and a real `legs[]` array. Because a current Alpaca MCP issue reports that some client bridges can serialize multi-leg arrays incorrectly, the runtime has an explicit `MCP_MLEG_UNKNOWN/FAIL -> HOLD` capability gate. Secrets never enter repository receipts; only credential-presence state is exposed to governance.

## Governance / creativity

Kopano Context treats the LLM as a stateless renter. Observations, proposals, risk decisions, tool intents, provider results and P&L are converted into evidence rather than trusted as conversational memory. KC decision receipts are content-hashed; Alpaca provider order IDs remain a separate external evidence class. This validates a reusable sovereign-agent pattern: **LLM proposal -> deterministic governance -> MCP capability gate -> paper execution -> external receipt**.

## Proof status

PR-1 and PR-2 are merged. The repository currently passes **30 deterministic tests** spanning strategy risk, paper-only enforcement, exact competition balance, drawdown, defined-risk protection, volatility/liquidity gates, broker rehydration, MCP multi-leg transport, Level 3 readiness and provider-receipt promotion. PR-3 remains an external gate until the actual competition account supplies inspectable evidence for the $100,000 starting balance, Level 3 capability, option data, successful MCP multi-leg round trip, an accepted paper order ID and post-submit reconciliation. Profitability is not claimed before P&L receipts exist.
