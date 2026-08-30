import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateCompetitionReadiness } from '../src/competition-gate.mjs';
import { prepareCompetitionOrder } from '../src/execution-runner.mjs';
import { ALPACA_PAPER_ORDERS_ENDPOINT } from '../src/transport-policy.mjs';

const policy = JSON.parse(await readFile(new URL('../strategy.policy.json', import.meta.url), 'utf8'));

function readyBase() {
  return {
    runtime: { paper_trade: true, credentials_present: true },
    account: {
      start_equity_receipt_verified: true,
      competition_start_equity: 100000,
      options_trading_level: 3,
      trading_blocked: false,
      account_blocked: false
    },
    market: { options_data_available: true }
  };
}

function verifiedRestFallback() {
  return {
    enabled: true,
    paper_only: true,
    endpoint: ALPACA_PAPER_ORDERS_ENDPOINT,
    upstream_workaround_verified: true
  };
}

function proposalInput() {
  return {
    account: { paper: true, competition_start_equity: 100000, equity: 100000 },
    portfolio: { defined_risk_usd: 1000 },
    market: {
      atm_iv: 0.36,
      realized_vol_20d: 0.24,
      iv_history_observations: 8,
      iv_percentile: null,
      relative_bid_ask_spread: 0.10,
      min_short_leg_open_interest: 500
    },
    candidate: {
      underlying: 'SPY',
      structure: 'credit_spread',
      dte: 14,
      short_delta: 0.18,
      max_loss_usd: 1800,
      legs: [
        { symbol: 'SPY_TEST_SHORT', position_intent: 'sell_to_open' },
        { symbol: 'SPY_TEST_LONG', position_intent: 'buy_to_open' }
      ],
      order_payload: {
        qty: '1',
        order_class: 'mleg',
        type: 'limit',
        limit_price: '1.25',
        time_in_force: 'day',
        legs: [
          { symbol: 'SPY_TEST_SHORT', ratio_qty: '1', side: 'sell', position_intent: 'sell_to_open' },
          { symbol: 'SPY_TEST_LONG', ratio_qty: '1', side: 'buy', position_intent: 'buy_to_open' }
        ]
      }
    },
    policy
  };
}

test('verified paper REST fallback can close only the MCP transport gate', () => {
  const env = readyBase();
  const result = evaluateCompetitionReadiness({
    ...env,
    capabilityProbe: { state: 'FAIL', legs_array_round_trip: false },
    transportFallback: verifiedRestFallback()
  });

  assert.equal(result.decision, 'READY');
  assert.equal(result.gates.mcp_multi_leg, false);
  assert.equal(result.gates.execution_transport, true);
  assert.equal(result.transport.mode, 'ALPACA_PAPER_REST');
});

test('runner emits provider-ready paper REST call after deterministic approval', () => {
  const env = readyBase();
  const result = prepareCompetitionOrder({
    runtime: env.runtime,
    account: env.account,
    marketReadiness: env.market,
    capabilityProbe: { state: 'FAIL', legs_array_round_trip: false },
    transportFallback: verifiedRestFallback(),
    proposalInput: proposalInput()
  });

  assert.equal(result.state, 'READY_TO_SUBMIT');
  assert.equal(result.readiness.transport.mode, 'ALPACA_PAPER_REST');
  assert.equal(result.call.method, 'POST');
  assert.equal(result.call.url, ALPACA_PAPER_ORDERS_ENDPOINT);
  assert.equal(result.call.paper_required, true);
  assert.ok(Array.isArray(result.call.body.legs));
});

test('REST fallback cannot point at live Alpaca trading endpoint', () => {
  const env = readyBase();
  const result = evaluateCompetitionReadiness({
    ...env,
    capabilityProbe: { state: 'FAIL', legs_array_round_trip: false },
    transportFallback: {
      ...verifiedRestFallback(),
      endpoint: 'https://api.alpaca.markets/v2/orders'
    }
  });

  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((reason) => reason.code === 'REST_FALLBACK_NOT_PAPER_ONLY'));
});

test('MCP remains preferred when its multi-leg bridge is healthy', () => {
  const env = readyBase();
  const result = evaluateCompetitionReadiness({
    ...env,
    capabilityProbe: { state: 'PASS', legs_array_round_trip: true },
    transportFallback: verifiedRestFallback()
  });

  assert.equal(result.decision, 'READY');
  assert.equal(result.transport.mode, 'ALPACA_MCP');
});
