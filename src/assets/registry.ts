import type { SovereignAsset } from './contract';

export const sovereignAssetRegistry: SovereignAsset[] = [
  {
    id: 'kopano.brand.primary-mark.v1',
    title: 'Kopano Labs primary brand mark',
    namespace: 'kopano-labs.brand',
    role: 'canonical',
    approval: 'approved',
    classification: 'confirmed',
    availability: 'ingested',
    owner: {
      name: 'Kopano Labs',
      organization: 'Kopano Labs',
      ownershipBasis: 'user-declared',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: '35a45cddf55bec086f1b938143cf2568083a53d88fb4d918d69d716879fc9ff0',
    },
    media: {
      mediaType: 'image/svg+xml',
      width: 512,
      height: 512,
      byteLength: 984,
    },
    lineage: {
      sourceReference: 'github://RobynAwesome/Kopano-Labs-Website@main/public/assets/brand/kopano-mark.svg',
    },
    allowedSurfaces: ['hub-header', 'hub-splash', 'own', 'create', 'governance-receipt'],
    notes: [
      'Canonical first-party mark is preserved in the governed Kopano Labs website repository.',
      'SHA-256 was independently re-derived from the exact 984-byte SVG source.',
      'Ownership remains user-declared; repository custody and hash verification do not independently prove authorship.',
      'The earlier chat JPEG candidate is superseded by this repository-backed canonical source.',
      'Open Graph distribution is intentionally excluded until an approved raster derivative is generated.',
    ],
  },
  {
    id: 'hub.evidence.mobile-shell.pr1',
    title: 'Kopano Sovereign Hub PR1 mobile baseline',
    namespace: 'kopano-sovereign-hub.product-evidence',
    role: 'reference',
    approval: 'reference-only',
    classification: 'confirmed',
    availability: 'evidence-only',
    owner: {
      name: 'Kopano Sovereign Hub',
      organization: 'Kopano Labs',
      ownershipBasis: 'user-declared',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: '8057ca4b0d29f23800127ee246f21a948c62a2cdd53442b978cd334de4e4a263',
    },
    media: {
      mediaType: 'image/jpeg',
      width: 674,
      height: 1536,
      byteLength: 161505,
    },
    lineage: {
      sourceReference: 'chat-evidence:Screenshot_2026-08-11-17-27-06-072_com.microsoft.emmx.jpg',
    },
    allowedSurfaces: [],
    notes: [
      'Baseline evidence for PR5 consumer-shell redesign.',
      'Reference evidence is never treated as a production artwork asset.',
    ],
  },
  {
    id: 'reference.game-discovery.msn.01',
    title: 'Simple game discovery over deep workstation reference',
    namespace: 'design-evidence.third-party',
    role: 'reference',
    approval: 'reference-only',
    classification: 'confirmed',
    availability: 'evidence-only',
    owner: {
      name: 'Third-party interaction reference',
      organization: 'Unclassified',
      ownershipBasis: 'third-party-reference',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: 'ed5252c722984e6eb540ed0df1a8b4a1a6ae82f11abd5ff8511da102f68893fd',
    },
    media: {
      mediaType: 'image/jpeg',
      width: 864,
      height: 1536,
      byteLength: 277829,
    },
    lineage: {
      sourceReference: 'chat-evidence:1000153772.jpg',
    },
    allowedSurfaces: [],
    notes: ['Interaction principle only: deep machinery underneath; simple action above. Do not redistribute or copy third-party UI.'],
  },
  {
    id: 'reference.game-discovery.msn.02',
    title: 'Game category navigation reference',
    namespace: 'design-evidence.third-party',
    role: 'reference',
    approval: 'reference-only',
    classification: 'confirmed',
    availability: 'evidence-only',
    owner: {
      name: 'Third-party interaction reference',
      organization: 'Unclassified',
      ownershipBasis: 'third-party-reference',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: 'be8e58fa6456c325bee8049f402dbd37d277022c6516eea8d8d237f1365fc660',
    },
    media: {
      mediaType: 'image/jpeg',
      width: 864,
      height: 1536,
      byteLength: 208007,
    },
    lineage: {
      sourceReference: 'chat-evidence:1000153780.jpg',
    },
    allowedSurfaces: [],
    notes: ['Reference-only evidence for PR5/PR8 information architecture.'],
  },
  {
    id: 'reference.deep-workstation.wolfram.01',
    title: 'Deep computation workstation reference',
    namespace: 'design-evidence.third-party',
    role: 'reference',
    approval: 'reference-only',
    classification: 'confirmed',
    availability: 'evidence-only',
    owner: {
      name: 'Third-party interaction reference',
      organization: 'Unclassified',
      ownershipBasis: 'third-party-reference',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: 'f718f68208574e092d8a813fa63ae00bc88ff804ed043ac534a92ed8f7f998c7',
    },
    media: {
      mediaType: 'image/jpeg',
      width: 1536,
      height: 676,
      byteLength: 170800,
    },
    lineage: {
      sourceReference: 'chat-evidence:1000153782.jpg',
    },
    allowedSurfaces: [],
    notes: ['Reference-only evidence establishing that complex computation can remain behind a simple consumer surface.'],
  },
  {
    id: 'jennifer.evidence.companion-matrix.01',
    title: 'Project: JENNIFER Digital Hippocampus substrate 001',
    namespace: 'project-jennifer',
    role: 'canonical',
    approval: 'approved',
    classification: 'confirmed',
    availability: 'ingested',
    owner: {
      name: 'Kholofelo Robyn Rababalela / Project Jennifer',
      organization: 'AMA-PHU Entertainment',
      ownershipBasis: 'user-declared',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: 'fece81fd26185b6d8ecddbace9ea4f0360425546d184fbd4ce430e2bae0290af',
    },
    media: {
      mediaType: 'image/png',
      width: 1408,
      height: 768,
      byteLength: 1358656,
    },
    lineage: {
      sourceReference: 'github://RobynAwesome/Project-Jennifer@main/assets/Project Companions/source/digital-hippocampus-substrate-001.png',
    },
    allowedSurfaces: ['play', 'create'],
    notes: [
      'Cross-repo canonical storage URI designates the preserved Project Jennifer source binary without duplicating it.',
      'SHA-256 matches the previously verified Sprint 02 evidence fingerprint.',
      'No Hub-specific derivative is required for direct governed use of this canonical original.',
    ],
  },
  {
    id: 'jennifer.evidence.companion-matrix.02',
    title: 'Project: JENNIFER embodied historical companion selection 001',
    namespace: 'project-jennifer',
    role: 'canonical',
    approval: 'approved',
    classification: 'confirmed',
    availability: 'ingested',
    owner: {
      name: 'Kholofelo Robyn Rababalela / Project Jennifer',
      organization: 'AMA-PHU Entertainment',
      ownershipBasis: 'user-declared',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: 'd11243151300124abfc418c99c08aab64ac5c5f6a4ffbd7bb6e0107a301f07e9',
    },
    media: {
      mediaType: 'image/png',
      width: 1408,
      height: 768,
      byteLength: 1585880,
    },
    lineage: {
      sourceReference: 'github://RobynAwesome/Project-Jennifer@main/assets/Project Companions/source/digital-hippocampus-companion-selection-embodied-historical-001.png',
    },
    allowedSurfaces: ['play', 'create'],
    notes: [
      'Cross-repo canonical storage URI designates the preserved Project Jennifer source binary without duplicating it.',
      'SHA-256 matches the previously verified Sprint 02 evidence fingerprint.',
      'No Hub-specific derivative is required for direct governed use of this canonical original.',
    ],
  },
  {
    id: 'jennifer.evidence.companion-matrix.03',
    title: 'Project: JENNIFER core-logic companion selection 001',
    namespace: 'project-jennifer',
    role: 'canonical',
    approval: 'approved',
    classification: 'confirmed',
    availability: 'ingested',
    owner: {
      name: 'Kholofelo Robyn Rababalela / Project Jennifer',
      organization: 'AMA-PHU Entertainment',
      ownershipBasis: 'user-declared',
    },
    fingerprint: {
      algorithm: 'sha256',
      value: '8be5f2d5f0c073ce5a9633965e4a067e53f36ba28097a2c83f1abe949716a5fb',
    },
    media: {
      mediaType: 'image/png',
      width: 1408,
      height: 768,
      byteLength: 1626808,
    },
    lineage: {
      sourceReference: 'github://RobynAwesome/Project-Jennifer@main/assets/Project Companions/source/digital-hippocampus-companion-selection-core-logic-001.png',
    },
    allowedSurfaces: ['play', 'create'],
    notes: [
      'Cross-repo canonical storage URI designates the preserved Project Jennifer source binary without duplicating it.',
      'SHA-256 matches the previously verified Sprint 02 evidence fingerprint.',
      'No Hub-specific derivative is required for direct governed use of this canonical original.',
    ],
  },
];

export function assetById(assetId: string) {
  return sovereignAssetRegistry.find((asset) => asset.id === assetId);
}
