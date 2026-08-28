import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateCompetitionReadiness } from '../src/competition-gate.mjs';
import { prepareCompetitionOrder, receiptAfterProviderResult } from '../src/execution-runner.mjs';

const policy = JSON.parse(await readFile(new URL('../strategy.policy.json', import.meta.url), 'utf8'));

function readyEnvironment() {
  return {
    runtime: { paper_trade: true, credentials_present: true },
    account: {
      start_equity_receipt_verified: true,
      competition_start_equity: 100000,
      options_trading_level: 3,
      trading_blocked: false,
      account_blocked: false
    },
    market: { options_data_available: true },
    capabilityProbe: { state: 'PASS', legs_array_round_trip: true }
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

test('missing credentials holds competition execution', () => {
  const env = readyEnvironment();
  env.runtime.credentials_present = false;
  const result = evaluateCompetitionReadiness(env);
  assert.equal(result.decision, 'HOLD');
  assert.ok(result.reasons.some((r) => r.code === 'CREDENTIALS_MISSING'));
});

test('live trading configuration is rejected', () => {
  const env = readyEnvironment();
  env.runtime.paper_trade = false;
  const result = evaluateCompetitionReadiness(env);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'PAPER_ONLY'));
});

test('missing immutable start-equity receipt holds readiness', () => {
  const env = readyEnvironment();
  env.account.start_equity_receipt_verified = false;
  const result = evaluateCompetitionReadiness(env);
  assert.equal(result.decision, 'HOLD');
  assert.ok(result.reasons.some((r) => r.code === 'START_EQUITY_RECEIPT_MISSING'));
});

test('wrong competition starting equity is rejected', () => {
  const env = readyEnvironment();
  env.account.competition_start_equity = 99999;
  const result = evaluateCompetitionReadiness(env);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'START_EQUITY_MISMATCH'));
});

test('Level 2 options capability holds spreads and iron condors', () => {
  const env = readyEnvironment();
  env.account.options_trading_level = 2;
  const result = evaluateCompetitionReadiness(env);
  assert.equal(result.decision, 'HOLD');
  assert.ok(result.reasons.some((r) => r.code === 'OPTIONS_LEVEL_3_REQUIRED'));
});

test('missing options market data holds readiness', () => {
  const env = readyEnvironment();
  env.market.options_data_available = false;
  const result = evaluateCompetitionReadiness(env);
  assert.equal(result.decision, 'HOLD');
  assert.ok(result.reasons.some((r) => r.code === 'OPTIONS_DATA_UNAVAILABLE'));
});

test('all external gates satisfied produces READY', () => {
  const result = evaluateCompetitionReadiness(readyEnvironment());
  assert.equal(result.decision, 'READY');
  assert.ok(Object.values(result.gates).every(Boolean));
});

test('runner refuses to create an order call while environment is externally gated', () => {
  const env = readyEnvironment();
  env.capabilityProbe = { state: 'UNKNOWN' };
  const result = prepareCompetitionOrder({
    runtime: env.runtime,
    account: env.account,
    marketReadiness: env.market,
    capabilityProbe: env.capabilityProbe,
    proposalInput: proposalInput()
  });
  assert.equal(result.state, 'EXTERNAL_GATE');
  assert.equal(result.call, null);
});

test('runner produces provider-ready call only after readiness and risk approval', () => {
  const env = readyEnvironment();
  const result = prepareCompetitionOrder({
    runtime: env.runtime,
    account: env.account,
    marketReadiness: env.market,
    capabilityProbe: env.capabilityProbe,
    proposalInput: proposalInput()
  });
  assert.equal(result.state, 'READY_TO_SUBMIT');
  assert.equal(result.call.tool, 'place_option_order');
  assert.equal(result.call.paper_required, true);
  assert.ok(Array.isArray(result.call.args.legs));
});

test('provider receipt promotion requires an actual provider order identifier', () => {
  assert.throws(() => receiptAfterProviderResult({
    timestamp: '2026-08-28T20:00:00+02:00',
    cycleId: 'cycle-002',
    observation: {},
    proposal: {},
    evaluation: { decision: 'APPROVE' },
    call: { tool: 'place_option_order' },
    providerResult: { status: 'accepted' }
  }));

  const receipt = receiptAfterProviderResult({
    timestamp: '2026-08-28T20:00:00+02:00',
    cycleId: 'cycle-002',
    observation: {},
    proposal: {},
    evaluation: { decision: 'APPROVE' },
    call: { tool: 'place_option_order' },
    providerResult: { id: 'paper-order-abc', status: 'accepted' }
  });
  assert.equal(receipt.proof_state, 'EXTERNAL_RECEIPT');
  assert.equal(receipt.provider_receipt_id, 'paper-order-abc');
});
