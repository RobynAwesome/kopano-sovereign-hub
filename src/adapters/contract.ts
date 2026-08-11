export type AdapterTrust = 'first-party' | 'governed' | 'external';
export type AdapterTransport = 'mock' | 'web-api' | 'oauth' | 'deep-link' | 'gateway';
export type AdapterOperation = 'read' | 'write' | 'execute';
export type ConsentState = 'granted' | 'denied' | 'not-required' | 'unknown';
export type AdapterGate = 'ALLOW' | 'REVIEW' | 'BLOCK';

export type AdapterCapability = {
  id: string;
  description: string;
  operations: AdapterOperation[];
  requiresConsent: boolean;
};

export type SovereignAdapter = {
  id: string;
  name: string;
  provider: string;
  trust: AdapterTrust;
  transport: AdapterTransport;
  version: string;
  capabilities: AdapterCapability[];
};

export type AdapterRequest = {
  requestId: string;
  adapterId: string;
  capabilityId: string;
  operations: AdapterOperation[];
  consent: ConsentState;
  revoked: boolean;
  requestedAt: string;
};

export type AdapterDecision = {
  gate: AdapterGate;
  reasons: string[];
};

export type AdapterExecutionReceipt = {
  receiptId: string;
  requestId: string;
  adapterId: string;
  capabilityId: string;
  operations: AdapterOperation[];
  gate: AdapterGate;
  outcome: 'executed' | 'review-required' | 'blocked';
  emittedAt: string;
};

export type AdapterRevocationReceipt = {
  receiptId: string;
  adapterId: string;
  capabilityId: string;
  revokedAt: string;
  reason: string;
};

export function capabilityFor(adapter: SovereignAdapter, capabilityId: string) {
  return adapter.capabilities.find((capability) => capability.id === capabilityId);
}
