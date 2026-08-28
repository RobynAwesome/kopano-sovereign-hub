import { createHash } from 'node:crypto';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function createDecisionReceipt({
  timestamp,
  cycleId,
  observation,
  proposal,
  evaluation,
  toolIntent = null,
  providerResult = null
}) {
  if (!timestamp || !cycleId) throw new Error('timestamp and cycleId are required');
  if (!evaluation?.decision) throw new Error('evaluation decision is required');

  const evidence = {
    schema: 'kopano.alpaca.decision-receipt.v1',
    timestamp,
    cycle_id: cycleId,
    observation,
    proposal,
    evaluation,
    tool_intent: toolIntent,
    provider_result: providerResult
  };
  const evidenceHash = digest(evidence);

  return {
    ...evidence,
    kc_receipt_id: `kc:alpaca:${evidenceHash.slice(0, 20)}`,
    evidence_sha256: evidenceHash,
    provider_receipt_id: providerResult?.order_id ?? providerResult?.id ?? null,
    proof_state: providerResult ? 'EXTERNAL_RECEIPT' : 'LOCAL_RECEIPT'
  };
}

export function serializeReceipt(receipt) {
  return `${JSON.stringify(receipt)}\n`;
}
