import { sovereignAdapters } from './catalog';
import type { AdapterGate, AdapterRequest } from './contract';
import { evaluateAdapterRequest } from './governance';

export type AdapterProofCase = {
  name: string;
  adapterId: string;
  request: AdapterRequest;
  expectedGate: AdapterGate;
};

export const adapterProofCases: AdapterProofCase[] = [
  {
    name: 'first-party read capability is allowed',
    adapterId: 'kopano.asset.read',
    expectedGate: 'ALLOW',
    request: {
      requestId: 'proof:first-party-read',
      adapterId: 'kopano.asset.read',
      capabilityId: 'asset.read',
      operations: ['read'],
      consent: 'not-required',
      revoked: false,
      requestedAt: '2026-08-11T00:00:00.000Z',
    },
  },
  {
    name: 'external read with consent remains under review before gateway proof',
    adapterId: 'external.media.discovery',
    expectedGate: 'REVIEW',
    request: {
      requestId: 'proof:external-read',
      adapterId: 'external.media.discovery',
      capabilityId: 'media.search',
      operations: ['read'],
      consent: 'granted',
      revoked: false,
      requestedAt: '2026-08-11T00:00:00.000Z',
    },
  },
  {
    name: 'external write without consent is blocked',
    adapterId: 'external.media.discovery',
    expectedGate: 'BLOCK',
    request: {
      requestId: 'proof:external-write-no-consent',
      adapterId: 'external.media.discovery',
      capabilityId: 'media.publish',
      operations: ['write'],
      consent: 'denied',
      revoked: false,
      requestedAt: '2026-08-11T00:00:00.000Z',
    },
  },
  {
    name: 'revocation overrides previous eligibility',
    adapterId: 'kopano.asset.read',
    expectedGate: 'BLOCK',
    request: {
      requestId: 'proof:revoked',
      adapterId: 'kopano.asset.read',
      capabilityId: 'asset.read',
      operations: ['read'],
      consent: 'not-required',
      revoked: true,
      requestedAt: '2026-08-11T00:00:00.000Z',
    },
  },
];

export function evaluateAdapterProofCases() {
  return adapterProofCases.map((proofCase) => {
    const adapter = sovereignAdapters.find((candidate) => candidate.id === proofCase.adapterId);
    if (!adapter) {
      return { ...proofCase, actualGate: 'BLOCK' as const, passed: false, error: 'Adapter declaration missing.' };
    }

    const decision = evaluateAdapterRequest(adapter, proofCase.request);
    return {
      ...proofCase,
      actualGate: decision.gate,
      passed: decision.gate === proofCase.expectedGate,
      reasons: decision.reasons,
    };
  });
}
