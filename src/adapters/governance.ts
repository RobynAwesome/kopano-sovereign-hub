import {
  capabilityFor,
  type AdapterDecision,
  type AdapterExecutionReceipt,
  type AdapterRequest,
  type AdapterRevocationReceipt,
  type SovereignAdapter,
} from './contract';

export function evaluateAdapterRequest(adapter: SovereignAdapter, request: AdapterRequest): AdapterDecision {
  const reasons: string[] = [];

  if (request.adapterId !== adapter.id) {
    return { gate: 'BLOCK', reasons: ['Request adapter identity does not match the declared adapter.'] };
  }

  const capability = capabilityFor(adapter, request.capabilityId);

  if (!capability) {
    return { gate: 'BLOCK', reasons: ['Capability is not declared by this adapter.'] };
  }

  if (request.revoked) {
    return { gate: 'BLOCK', reasons: ['Capability has been revoked.'] };
  }

  const undeclaredOperation = request.operations.find((operation) => !capability.operations.includes(operation));
  if (undeclaredOperation) {
    return { gate: 'BLOCK', reasons: [`Operation ${undeclaredOperation} is outside the declared capability.`] };
  }

  if (capability.requiresConsent && request.consent !== 'granted') {
    return { gate: 'BLOCK', reasons: ['Explicit user consent is required for this capability.'] };
  }

  const mutatesState = request.operations.some((operation) => operation === 'write' || operation === 'execute');

  if (mutatesState) {
    reasons.push('Write/execute operations require stronger transport and receipt validation than read-only access.');
  }

  if (adapter.transport === 'mock') {
    reasons.push('Mock transport remains valid only for bounded contract proof.');
  }

  if (adapter.trust === 'first-party' && !mutatesState) {
    reasons.push('First-party read capability can inherit Kopano-Phu governance defaults.');
    return { gate: 'ALLOW', reasons };
  }

  if (adapter.trust === 'external') {
    if (adapter.transport === 'gateway' && !mutatesState) {
      reasons.push('External read capability is isolated behind a declared rigid gateway.');
      reasons.push('Gateway transport is read-only and returns a KC-compatible execution receipt.');
      return { gate: 'ALLOW', reasons };
    }

    reasons.push('External trust boundary requires a proven gateway or equivalent governed transport.');
    return { gate: 'REVIEW', reasons };
  }

  if (mutatesState) {
    return { gate: 'REVIEW', reasons };
  }

  reasons.push('Governed capability is declared and bounded.');
  return { gate: 'ALLOW', reasons };
}

function receiptId(prefix: string, requestId: string) {
  return `${prefix}:${requestId}`;
}

export function emitExecutionReceipt(
  adapter: SovereignAdapter,
  request: AdapterRequest,
  decision: AdapterDecision,
  emittedAt = new Date().toISOString(),
): AdapterExecutionReceipt {
  return {
    receiptId: receiptId('exec', request.requestId),
    requestId: request.requestId,
    adapterId: adapter.id,
    capabilityId: request.capabilityId,
    operations: request.operations,
    gate: decision.gate,
    outcome: decision.gate === 'ALLOW' ? 'executed' : decision.gate === 'REVIEW' ? 'review-required' : 'blocked',
    emittedAt,
  };
}

export function emitRevocationReceipt(
  adapterId: string,
  capabilityId: string,
  reason: string,
  revokedAt = new Date().toISOString(),
): AdapterRevocationReceipt {
  return {
    receiptId: `revoke:${adapterId}:${capabilityId}:${revokedAt}`,
    adapterId,
    capabilityId,
    revokedAt,
    reason,
  };
}
