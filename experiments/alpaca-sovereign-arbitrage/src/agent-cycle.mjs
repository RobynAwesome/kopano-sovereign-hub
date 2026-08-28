import { evaluateTradeIntent } from './risk-engine.mjs';
import { assertToolAllowed } from './alpaca-tool-contract.mjs';

/**
 * PR-1 deliberately stops before brokerage execution.
 * It converts an LLM proposal into a governed execution intent only.
 */
export function governAgentProposal(input) {
  const evaluation = evaluateTradeIntent(input);

  if (evaluation.decision !== 'APPROVE') {
    return {
      ...evaluation,
      execution: null
    };
  }

  assertToolAllowed('place_option_order', { execute: true });
  return {
    ...evaluation,
    execution: {
      tool: 'place_option_order',
      mode: 'PREVIEW_ONLY',
      paper_required: true,
      payload: input.candidate.order_payload ?? null
    }
  };
}
