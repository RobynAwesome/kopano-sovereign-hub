import assert from 'node:assert/strict';
import test from 'node:test';

import {
  marketHold,
  normalizePrimarySymbol,
  projectMarketObservation,
} from '../src/lefa-market-observation.ts';

const snapshot = {
  symbol: 'SPY',
  latestTrade: {
    t: '2026-09-01T20:21:00.791640Z',
    p: 762.15,
  },
  latestQuote: {
    t: '2026-09-01T20:00:08.155928Z',
    bp: 761.85,
    ap: 0,
  },
  minuteBar: {
    t: '2026-09-01T20:21:00Z',
    c: 762.15,
  },
};

const clock = {
  timestamp: '2026-09-02T05:14:16.861137-04:00',
  is_open: false,
  next_open: '2026-09-02T09:30:00-04:00',
  next_close: '2026-09-02T16:00:00-04:00',
};

test('projects valid provider snapshot without inventing zero ask liquidity', () => {
  const result = projectMarketObservation(
    snapshot,
    clock,
    'SPY',
    '2026-09-02T09:15:00.000Z',
  );

  assert.equal(result.observation_state, 'OBSERVED');
  assert.equal(result.feed, 'iex');
  assert.equal(result.latest_trade_price, 762.15);
  assert.equal(result.bid_price, 761.85);
  assert.equal(result.ask_price, null);
  assert.equal(result.minute_close, 762.15);
  assert.equal(result.market_open, false);
  assert.equal(result.market_state, 'closed');
  assert.equal(result.source_timestamp, '2026-09-01T20:21:00.791640Z');
  assert.equal(result.observed_at, '2026-09-02T09:15:00.000Z');
  assert.deepEqual(result.provenance, {
    source: 'alpaca_market_data',
    is_fixture: false,
  });
});

test('account/provider snapshot cannot be promoted when latest trade is absent', () => {
  const result = projectMarketObservation(
    { symbol: 'SPY', latestQuote: snapshot.latestQuote },
    clock,
    'SPY',
  );

  assert.equal(result.observation_state, 'HOLD');
  assert.equal(result.code, 'MARKET_PROVIDER_TRADE_MISSING');
  assert.equal(result.latest_trade_price, null);
});

test('clock is required instead of browser market-hours guessing', () => {
  const result = projectMarketObservation(snapshot, { is_open: false }, 'SPY');

  assert.equal(result.observation_state, 'HOLD');
  assert.equal(result.code, 'MARKET_PROVIDER_CLOCK_INVALID');
  assert.equal(result.market_state, 'unknown');
});

test('provider symbol mismatch fails closed', () => {
  const result = projectMarketObservation({ ...snapshot, symbol: 'QQQ' }, clock, 'SPY');

  assert.equal(result.observation_state, 'HOLD');
  assert.equal(result.code, 'MARKET_PROVIDER_SYMBOL_MISMATCH');
});

test('market hold never fabricates market facts', () => {
  const result = marketHold('SPY', 'MARKET_PROVIDER_UNREACHABLE', '2026-09-02T09:15:00Z');

  assert.equal(result.observation_state, 'HOLD');
  assert.equal(result.latest_trade_price, null);
  assert.equal(result.source_timestamp, null);
  assert.equal(result.market_open, null);
  assert.equal(result.provenance.is_fixture, false);
});

test('primary symbol is server-normalized and invalid values return to SPY', () => {
  assert.equal(normalizePrimarySymbol('qqq'), 'QQQ');
  assert.equal(normalizePrimarySymbol(' BRK.B '), 'BRK.B');
  assert.equal(normalizePrimarySymbol('../../secret'), 'SPY');
  assert.equal(normalizePrimarySymbol(undefined), 'SPY');
});
