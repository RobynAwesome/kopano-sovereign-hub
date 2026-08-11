import type {
  AdapterDecision,
  AdapterExecutionReceipt,
  AdapterRequest,
  AdapterRevocationReceipt,
  SovereignAdapter,
} from './contract';
import { emitExecutionReceipt, emitRevocationReceipt, evaluateAdapterRequest } from './governance';

export type MockExecutionResult = {
  decision: AdapterDecision;
  receipt: AdapterExecutionReceipt;
  payload: null | {
    simulated: true;
    adapterId: string;
    capabilityId: string;
  };
};

export type RevocationLedger = AdapterRevocationReceipt[];

export function isRevoked(ledger: RevocationLedger, adapterId: string, capabilityId: string) {
  return ledger.some((receipt) => receipt.adapterId === adapterId && receipt.capabilityId === capabilityId);
}

export function applyRevocationState(request: AdapterRequest, ledger: RevocationLedger): AdapterRequest {
  return {
    ...request,
    revoked: request.revoked || isRevoked(ledger, request.adapterId, request.capabilityId),
  };
}

export function revokeCapability(
  ledger: RevocationLedger,
  adapterId: string,
  capabilityId: string,
  reason: string,
  revokedAt?: string,
): RevocationLedger {
  if (isRevoked(ledger, adapterId, capabilityId)) return ledger;
  return [...ledger, emitRevocationReceipt(adapterId, capabilityId, reason, revokedAt)];
}

export function executeBoundedMock(
  adapter: SovereignAdapter,
  request: AdapterRequest,
  ledger: RevocationLedger = [],
  emittedAt?: string,
): MockExecutionResult {
  const governedRequest = applyRevocationState(request, ledger);
  const decision = evaluateAdapterRequest(adapter, governedRequest);
  const receipt = emitExecutionReceipt(adapter, governedRequest, decision, emittedAt);

  return {
    decision,
    receipt,
    payload: decision.gate === 'ALLOW'
      ? {
          simulated: true,
          adapterId: adapter.id,
          capabilityId: governedRequest.capabilityId,
        }
      : null,
  };
}
