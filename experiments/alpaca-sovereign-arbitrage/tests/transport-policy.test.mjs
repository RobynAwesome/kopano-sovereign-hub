import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPACA_PAPER_ORDERS_ENDPOINT,
  buildPaperRestOrderCall,
  selectExecutionTransport
} from '../src/transport-policy.mjs';

const approvedProposal = {
  decision: 'APPROVE',
  execution: {
    paper_required: true,
    payload: {
      qty: '1',
      order_class: 'mleg',
      type: 'limit',
      limit_price: '1.25',
      time_in_force: 'day',
      legs: [
        { symbol: 'SPY_SHORT', ratio_qty: '1', side: 'sell', position_intent: 'sell_to_open' },
        { symbol: 'SPY_LONG', ratio_qty: '1', side: 'buy', position_intent: 'buy_to_open' }
      ]
    }
  }
};

test('prefers MCP when multi-leg capability is proven', () => {
  const result = selectExecutionTransport({
    mcpCapability: { decision: 'APPROVE', code: 'MCP_MLEG_CAPABLE' },
    restFallback: {
      enabled: true,
      paper_only: true,
      endpoint: ALPACA_PAPER_ORDERS_ENDPOINT,
      upstream_workaround_verified: true
    }
  });
  assert.equal(result.decision, 'APPROVE');
  assert.equal(result.mode, 'ALPACA_MCP');
});

test('uses verified paper REST fallback when MCP multi-leg transport fails', () => {
  const result = selectExecutionTransport({
    mcpCapability: { decision: 'HOLD', code: 'MCP_MLEG_FAIL', message: 'legs[] serialized as string' },
    restFallback: {
      enabled: true,
      paper_only: true,
      endpoint: ALPACA_PAPER_ORDERS_ENDPOINT,
      upstream_workaround_verified: true
    }
  });
  assert.equal(result.decision, 'APPROVE');
  assert.equal(result.mode, 'ALPACA_PAPER_REST');
  assert.equal(result.mcpCode, 'MCP_MLEG_FAIL');
});

test('rejects fallback that is not pinned to Alpaca paper endpoint', () => {
  const result = selectExecutionTransport({
    mcpCapability: { decision: 'HOLD', code: 'MCP_MLEG_FAIL' },
    restFallback: {
      enabled: true,
      paper_only: true,
      endpoint: 'https://api.alpaca.markets/v2/orders',
      upstream_workaround_verified: true
    }
  });
  assert.equal(result.decision, 'REJECT');
  assert.equal(result.code, 'REST_FALLBACK_NOT_PAPER_ONLY');
});

test('holds unverified paper REST fallback', () => {
  const result = selectExecutionTransport({
    mcpCapability: { decision: 'HOLD', code: 'MCP_MLEG_UNKNOWN' },
    restFallback: {
      enabled: true,
      paper_only: true,
      endpoint: ALPACA_PAPER_ORDERS_ENDPOINT,
      upstream_workaround_verified: false
    }
  });
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.code, 'REST_FALLBACK_UNVERIFIED');
});

test('paper REST call preserves legs array and references auth only by env names', () => {
  const transport = selectExecutionTransport({
    mcpCapability: { decision: 'HOLD', code: 'MCP_MLEG_FAIL' },
    restFallback: {
      enabled: true,
      paper_only: true,
      endpoint: ALPACA_PAPER_ORDERS_ENDPOINT,
      upstream_workaround_verified: true
    }
  });
  const result = buildPaperRestOrderCall({ governedProposal: approvedProposal, transport });
  assert.equal(result.call.url, ALPACA_PAPER_ORDERS_ENDPOINT);
  assert.deepEqual(result.call.auth_env, ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY']);
  assert.ok(Array.isArray(result.call.body.legs));
  assert.equal(result.call.paper_required, true);
});
