import { governAgentProposal } from './agent-cycle.mjs';
import { buildOptionOrderCall } from './mcp-adapter.mjs';
import { evaluateCompetitionReadiness } from './competition-gate.mjs';
import { createDecisionReceipt } from './evidence-journal.mjs';

/**
 * Produces a provider-ready paper order call only after both environment readiness
 * and deterministic strategy risk approval. This module does not invoke Alpaca.
 */
export function prepareCompetitionOrder({ runtime, account, marketReadiness, capabilityProbe, proposalInput }) {
  const readiness = evaluateCompetitionReadiness({
    runtime,
    account,
    market: marketReadiness,
    capabilityProbe
  });

  if (readiness.decision !== 'READY') {
    return { state: 'EXTERNAL_GATE', readiness, evaluation: null, call: null };
  }

  const governed = governAgentProposal(proposalInput);
  if (governed.decision !== 'APPROVE') {
    return { state: 'RISK_GATE', readiness, evaluation: governed, call: null };
  }

  const order = buildOptionOrderCall({ governedProposal: governed, capabilityProbe });
  if (order.decision !== 'APPROVE') {
    return { state: 'EXTERNAL_GATE', readiness, evaluation: governed, call: null };
  }

  return {
    state: 'READY_TO_SUBMIT',
    readiness,
    evaluation: governed,
    call: order.call
  };
}

export function receiptAfterProviderResult({ timestamp, cycleId, observation, proposal, evaluation, call, providerResult }) {
  if (!providerResult?.id && !providerResult?.order_id) {
    throw new Error('provider order receipt is required');
  }
  return createDecisionReceipt({
    timestamp,
    cycleId,
    observation,
    proposal,
    evaluation,
    toolIntent: call,
    providerResult
  });
}
