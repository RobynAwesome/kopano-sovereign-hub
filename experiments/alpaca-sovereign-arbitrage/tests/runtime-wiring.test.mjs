import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRehydrationPlan,
  buildMarketObservationPlan,
  evaluateMultiLegCapability,
  buildOptionOrderCall
} from '../src/mcp-adapter.mjs';
import { createDecisionReceipt, serializeReceipt } from '../src/evidence-journal.mjs';

function approvedProposal() {
  return {
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
          { symbol: 'SPY_TEST_SHORT', ratio_qty: '1', side: 'sell', position_intent: 'sell_to_open' },
          { symbol: 'SPY_TEST_LONG', ratio_qty: '1', side: 'buy', position_intent: 'buy_to_open' }
        ]
      }
    }
  };
}

test('rehydration plan reconstructs broker truth before local memory', () => {
  const plan = buildRehydrationPlan();
  assert.deepEqual(plan.map((call) => call.tool), ['get_account_info', 'get_all_positions', 'get_orders', 'get_clock']);
  assert.ok(plan.every((call) => call.execute === false));
});

test('market plan uses bounded observation tools only', () => {
  const plan = buildMarketObservationPlan('SPY');
  assert.deepEqual(plan.map((call) => call.tool), ['get_stock_bars', 'get_option_contracts', 'get_option_chain']);
  assert.ok(plan.every((call) => call.execute === false));
});

test('unknown multi-leg capability holds execution', () => {
  const result = evaluateMultiLegCapability({ state: 'UNKNOWN' });
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.code, 'MCP_MLEG_UNKNOWN');
});

test('failed legs array round-trip holds execution', () => {
  const result = evaluateMultiLegCapability({ state: 'FAIL', legs_array_round_trip: false });
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.code, 'MCP_MLEG_FAIL');
});

test('approved proposal still requires a proven MCP multi-leg bridge', () => {
  const held = buildOptionOrderCall({ governedProposal: approvedProposal(), capabilityProbe: { state: 'UNKNOWN' } });
  assert.equal(held.decision, 'HOLD');
  assert.equal(held.call, null);
});

test('proven bridge preserves legs as an array in place_option_order intent', () => {
  const result = buildOptionOrderCall({
    governedProposal: approvedProposal(),
    capabilityProbe: { state: 'PASS', legs_array_round_trip: true }
  });
  assert.equal(result.decision, 'APPROVE');
  assert.equal(result.call.tool, 'place_option_order');
  assert.equal(result.call.paper_required, true);
  assert.ok(Array.isArray(result.call.args.legs));
  assert.equal(result.call.args.legs.length, 2);
});

test('decision receipts are deterministic and distinguish local from provider proof', () => {
  const base = {
    timestamp: '2026-08-28T19:30:00+02:00',
    cycleId: 'cycle-001',
    observation: { underlying: 'SPY', atm_iv: 0.36 },
    proposal: { structure: 'credit_spread' },
    evaluation: { decision: 'APPROVE', reasons: [] },
    toolIntent: { tool: 'place_option_order', mode: 'PREVIEW_ONLY' }
  };
  const a = createDecisionReceipt(base);
  const b = createDecisionReceipt(base);
  assert.equal(a.kc_receipt_id, b.kc_receipt_id);
  assert.equal(a.evidence_sha256, b.evidence_sha256);
  assert.equal(a.proof_state, 'LOCAL_RECEIPT');
  assert.equal(a.provider_receipt_id, null);
  assert.ok(serializeReceipt(a).endsWith('\n'));

  const external = createDecisionReceipt({ ...base, providerResult: { order_id: 'paper-order-123' } });
  assert.equal(external.proof_state, 'EXTERNAL_RECEIPT');
  assert.equal(external.provider_receipt_id, 'paper-order-123');
});
