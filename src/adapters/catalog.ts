import type { SovereignAdapter } from './contract';

export const sovereignAdapters: SovereignAdapter[] = [
  {
    id: 'kopano.asset.read',
    name: 'Kopano Asset Reader',
    provider: 'Kopano Labs',
    trust: 'first-party',
    transport: 'mock',
    version: '0.1.0',
    capabilities: [
      {
        id: 'asset.read',
        description: 'Read bounded first-party media metadata from the future sovereign asset registry.',
        operations: ['read'],
        requiresConsent: false,
      },
    ],
  },
  {
    id: 'external.media.discovery',
    name: 'External Media Discovery Candidate',
    provider: 'External',
    trust: 'external',
    transport: 'mock',
    version: '0.1.0',
    capabilities: [
      {
        id: 'media.search',
        description: 'Provider-neutral read-only media discovery contract for a future supported API.',
        operations: ['read'],
        requiresConsent: true,
      },
      {
        id: 'media.publish',
        description: 'Write capability intentionally retained behind review until a rigid gateway is proven.',
        operations: ['write'],
        requiresConsent: true,
      },
    ],
  },
];
