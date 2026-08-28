# PRE-SEED — PR-2 Runtime Wiring

## Base receipt

- PR-1 merged as `261553de8b7335e22abbf2806ccaa032d8d59161`.
- Strategy/risk kernel: 13/13 deterministic tests green before merge.
- Constitutional authority remains `Introduction-to-MCP`; Sovereign Hub is the runtime consumer.

## Invariants

- Registry admission must not claim live brokerage proof.
- Alpaca remains paper-only in this hackathon lane.
- Broker account/order/position state outranks cached local memory on restart.
- KC receipt IDs and provider order IDs remain separate evidence classes.
- Complex options execution remains `HOLD` until the actual MCP client proves that `legs[]` survives transport as an array.

## External integration risk

A current Alpaca MCP Server issue (#97, opened 2026-07-01) reports some MCP clients serializing multi-leg `legs[]` as a string. PR-2 therefore makes multi-leg transport capability an explicit runtime gate rather than assuming server schema equals client behavior.
