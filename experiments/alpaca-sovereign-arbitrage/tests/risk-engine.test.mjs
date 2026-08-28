import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateTradeIntent, shouldClosePosition } from '../src/risk-engine.mjs';
import { assertToolAllowed, paperRuntimeEnvironment } from '../src/alpaca-tool-contract.mjs';

const policy = JSON.parse(await readFile(new URL('../strategy.policy.json', import.meta.url), 'utf8'));

function validInput() {
  return {
    account: {
      paper: true,
      competition_start_equity: 100000,
      equity: 100000
    },
    portfolio: {
      defined_risk_usd: 2500
    },
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
      order_payload: { order_class: 'mleg' }
    },
    policy
  };
}

test('approves a bounded, liquid, paper-only defined-risk proposal', () => {
  const result = evaluateTradeIntent(validInput());
  assert.equal(result.decision, 'APPROVE');
  assert.equal(result.reasons.length, 0);
});

test('rejects a live-account proposal', () => {
  const input = validInput();
  input.account.paper = false;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'PAPER_ONLY'));
});

test('rejects an account that did not start at the competition balance', () => {
  const input = validInput();
  input.account.competition_start_equity = 99999;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'START_EQUITY_MISMATCH'));
});

test('rejects risk above 3% of current equity', () => {
  const input = validInput();
  input.candidate.max_loss_usd = 3000.01;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'TRADE_RISK_CAP'));
});

test('rejects opening naked short options', () => {
  const input = validInput();
  input.candidate.legs = [
    { symbol: 'SPY_TEST_SHORT_1', position_intent: 'sell_to_open' },
    { symbol: 'SPY_TEST_SHORT_2', position_intent: 'sell_to_open' }
  ];
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'NAKED_SHORT'));
});

test('trips the 5% drawdown kill switch', () => {
  const input = validInput();
  input.account.equity = 95000;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'DRAWDOWN_KILL_SWITCH'));
});

test('does not require IV percentile until enough local IV history exists', () => {
  const input = validInput();
  input.market.iv_history_observations = policy.entry.iv_percentile_min_observations - 1;
  input.market.iv_percentile = null;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'APPROVE');
});

test('requires IV percentile once the history gate is mature', () => {
  const input = validInput();
  input.market.iv_history_observations = policy.entry.iv_percentile_min_observations;
  input.market.iv_percentile = null;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'HOLD');
  assert.ok(result.reasons.some((r) => r.code === 'IV_PERCENTILE_UNKNOWN'));
});

test('rejects an underpriced volatility regime', () => {
  const input = validInput();
  input.market.atm_iv = 0.20;
  input.market.realized_vol_20d = 0.25;
  const result = evaluateTradeIntent(input);
  assert.equal(result.decision, 'REJECT');
  assert.ok(result.reasons.some((r) => r.code === 'VOLATILITY_PREMIUM'));
});

test('exit rule is not self-contradictory with the 7-21 DTE entry window', () => {
  const atEntry = shouldClosePosition({ dte: 14, maxCredit: 100, currentProfit: 10, policy });
  assert.equal(atEntry.close, false);

  const atFloor = shouldClosePosition({ dte: 5, maxCredit: 100, currentProfit: 10, policy });
  assert.equal(atFloor.close, true);
  assert.ok(atFloor.reasons.includes('DTE_FLOOR'));
});

test('profit target closes at 50% of max credit', () => {
  const result = shouldClosePosition({ dte: 14, maxCredit: 200, currentProfit: 100, policy });
  assert.equal(result.close, true);
  assert.ok(result.reasons.includes('PROFIT_TARGET'));
});

test('tool boundary excludes generic or non-options execution names', () => {
  assert.equal(assertToolAllowed('get_option_chain'), true);
  assert.throws(() => assertToolAllowed('place_order', { execute: true }));
  assert.throws(() => assertToolAllowed('place_stock_order', { execute: true }));
  assert.equal(assertToolAllowed('place_option_order', { execute: true }), true);
});

test('paper runtime is explicit and toolsets are bounded', () => {
  const env = paperRuntimeEnvironment();
  assert.equal(env.ALPACA_PAPER_TRADE, 'true');
  assert.match(env.ALPACA_TOOLSETS, /options-data/);
  assert.match(env.ALPACA_TOOLSETS, /trading/);
});
