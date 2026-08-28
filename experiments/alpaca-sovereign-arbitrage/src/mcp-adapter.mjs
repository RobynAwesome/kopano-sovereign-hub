import { assertToolAllowed } from './alpaca-tool-contract.mjs';

const MLEG_STATES = new Set(['PASS', 'FAIL', 'UNKNOWN']);

function observationCall(tool, args = {}) {
  assertToolAllowed(tool);
  return { tool, args, execute: false };
}

export function buildRehydrationPlan() {
  return [
    observationCall('get_account_info'),
    observationCall('get_all_positions'),
    observationCall('get_orders', { status: 'all' }),
    observationCall('get_clock')
  ];
}

export function buildMarketObservationPlan(underlying) {
  if (typeof underlying !== 'string' || !underlying.trim()) {
    throw new Error('underlying is required');
  }
  return [
    observationCall('get_stock_bars', { symbols: underlying }),
    observationCall('get_option_contracts', { underlying_symbol: underlying }),
    observationCall('get_option_chain', { underlying_symbol: underlying })
  ];
}

export function evaluateMultiLegCapability(probe) {
  const state = probe?.state ?? 'UNKNOWN';
  if (!MLEG_STATES.has(state)) throw new Error(`invalid multi-leg capability state: ${state}`);

  if (state === 'PASS' && probe?.legs_array_round_trip === true) {
    return { decision: 'APPROVE', code: 'MCP_MLEG_CAPABLE' };
  }
  if (state === 'FAIL') {
    return {
      decision: 'HOLD',
      code: 'MCP_MLEG_FAIL',
      message: 'MCP client bridge did not preserve the multi-leg legs[] array.'
    };
  }
  return {
    decision: 'HOLD',
    code: 'MCP_MLEG_UNKNOWN',
    message: 'Multi-leg MCP transport must be proven before complex-order execution.'
  };
}

export function buildOptionOrderCall({ governedProposal, capabilityProbe }) {
  if (governedProposal?.decision !== 'APPROVE') {
    throw new Error('risk engine approval is required');
  }
  if (governedProposal?.execution?.paper_required !== true) {
    throw new Error('paper execution invariant is required');
  }

  const capability = evaluateMultiLegCapability(capabilityProbe);
  if (capability.decision !== 'APPROVE') {
    return { decision: 'HOLD', capability, call: null };
  }

  const payload = governedProposal.execution.payload;
  if (!payload || payload.order_class !== 'mleg' || !Array.isArray(payload.legs) || payload.legs.length < 2) {
    throw new Error('multi-leg payload must contain a legs[] array');
  }

  assertToolAllowed('place_option_order', { execute: true });
  return {
    decision: 'APPROVE',
    capability,
    call: {
      tool: 'place_option_order',
      args: payload,
      execute: true,
      paper_required: true
    }
  };
}
