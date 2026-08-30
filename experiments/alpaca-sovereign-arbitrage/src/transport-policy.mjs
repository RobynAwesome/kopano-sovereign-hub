export const ALPACA_PAPER_ORDERS_ENDPOINT = 'https://paper-api.alpaca.markets/v2/orders';

function hold(code, message, extra = {}) {
  return { decision: 'HOLD', code, message, ...extra };
}

function reject(code, message, extra = {}) {
  return { decision: 'REJECT', code, message, ...extra };
}

export function selectExecutionTransport({ mcpCapability, restFallback } = {}) {
  if (mcpCapability?.decision === 'APPROVE') {
    return {
      decision: 'APPROVE',
      mode: 'ALPACA_MCP',
      code: mcpCapability.code ?? 'MCP_MLEG_CAPABLE',
      upstreamIssue: 'alpacahq/alpaca-mcp-server#97'
    };
  }

  if (restFallback?.enabled !== true) {
    return hold(
      mcpCapability?.code ?? 'EXECUTION_TRANSPORT_UNAVAILABLE',
      mcpCapability?.message ?? 'No approved multi-leg execution transport is available.'
    );
  }

  if (restFallback?.paper_only !== true || restFallback?.endpoint !== ALPACA_PAPER_ORDERS_ENDPOINT) {
    return reject(
      'REST_FALLBACK_NOT_PAPER_ONLY',
      'REST fallback must be pinned to the Alpaca paper orders endpoint.'
    );
  }

  if (restFallback?.upstream_workaround_verified !== true) {
    return hold(
      'REST_FALLBACK_UNVERIFIED',
      'Paper REST fallback must be explicitly verified before it can replace a failed MCP multi-leg bridge.'
    );
  }

  return {
    decision: 'APPROVE',
    mode: 'ALPACA_PAPER_REST',
    code: 'PAPER_REST_FALLBACK_APPROVED',
    endpoint: ALPACA_PAPER_ORDERS_ENDPOINT,
    mcpCode: mcpCapability?.code ?? 'MCP_MLEG_UNKNOWN',
    upstreamIssue: 'alpacahq/alpaca-mcp-server#97',
    upstreamFixPr: 'alpacahq/alpaca-mcp-server#107'
  };
}

export function buildPaperRestOrderCall({ governedProposal, transport }) {
  if (governedProposal?.decision !== 'APPROVE') {
    throw new Error('risk engine approval is required');
  }
  if (governedProposal?.execution?.paper_required !== true) {
    throw new Error('paper execution invariant is required');
  }
  if (transport?.decision !== 'APPROVE' || transport?.mode !== 'ALPACA_PAPER_REST') {
    throw new Error('approved Alpaca paper REST transport is required');
  }

  const payload = governedProposal.execution.payload;
  if (!payload || payload.order_class !== 'mleg' || !Array.isArray(payload.legs) || payload.legs.length < 2) {
    throw new Error('multi-leg payload must contain a legs[] array');
  }

  return {
    decision: 'APPROVE',
    call: {
      transport: 'ALPACA_PAPER_REST',
      method: 'POST',
      url: ALPACA_PAPER_ORDERS_ENDPOINT,
      body: payload,
      auth_env: ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY'],
      execute: true,
      paper_required: true,
      upstream_issue: 'alpacahq/alpaca-mcp-server#97'
    }
  };
}
