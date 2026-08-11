import { sovereignAdapters } from './catalog';
import type { AdapterGate, AdapterRequest } from './contract';
import { executeBoundedMock, revokeCapability, type RevocationLedger } from './runtime';

export type AdapterProofCase = {
  name: string;
  adapterId: string;
  request: AdapterRequest;
  expectedGate: AdapterGate;
  revokeBefore?: boolean;
};

export const adapterProofCases: AdapterProofCase[] = [
  {
    name: 'first-party read capability is allowed and executes',
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
    name: 'rigid YouTube gateway allows bounded public read',
    adapterId: 'youtube.public-media.read',
    expectedGate: 'ALLOW',
    request: {
      requestId: 'proof:youtube-gateway-read',
      adapterId: 'youtube.public-media.read',
      capabilityId: 'youtube.channel.uploads.read',
      operations: ['read'],
      consent: 'not-required',
      revoked: false,
      requestedAt: '2026-08-11T00:00:00.000Z',
    },
  },
  {
    name: 'revocation ledger overrides previous first-party eligibility',
    adapterId: 'kopano.asset.read',
    expectedGate: 'BLOCK',
    revokeBefore: true,
    request: {
      requestId: 'proof:revoked',
      adapterId: 'kopano.asset.read',
      capabilityId: 'asset.read',
      operations: ['read'],
      consent: 'not-required',
      revoked: false,
      requestedAt: '2026-08-11T00:00:00.000Z',
    },
  },
];

export function evaluateAdapterProofCases() {
  return adapterProofCases.map((proofCase) => {
    const adapter = sovereignAdapters.find((candidate) => candidate.id === proofCase.adapterId);
    if (!adapter) {
      return {
        ...proofCase,
        actualGate: 'BLOCK' as const,
        outcome: 'blocked' as const,
        receiptId: 'missing-adapter',
        passed: false,
        error: 'Adapter declaration missing.',
      };
    }

    let ledger: RevocationLedger = [];
    if (proofCase.revokeBefore) {
      ledger = revokeCapability(
        ledger,
        proofCase.request.adapterId,
        proofCase.request.capabilityId,
        'Sprint 01 revocation proof.',
        '2026-08-11T00:00:01.000Z',
      );
    }

    const result = executeBoundedMock(
      adapter,
      proofCase.request,
      ledger,
      '2026-08-11T00:00:02.000Z',
    );

    return {
      ...proofCase,
      actualGate: result.decision.gate,
      outcome: result.receipt.outcome,
      receiptId: result.receipt.receiptId,
      passed: result.decision.gate === proofCase.expectedGate,
      reasons: result.decision.reasons,
    };
  });
}
