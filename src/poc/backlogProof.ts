import { assetById } from '../assets/registry';
import { canDistribute } from '../assets/validation';
import { sovereignSurfaces } from '../data/registry';
import { validatedCommerceReceipts, validatedCreatorPayoutReceipts } from './externalReceipts';

export type BacklogProofState = 'PASS' | 'EXTERNAL_GATE' | 'FAIL';

export type BacklogProofReceipt = {
  issue: 5 | 6 | 7 | 8 | 9 | 14;
  sprint: string;
  title: string;
  state: BacklogProofState;
  receiptId: string;
  path: string;
  evidence: string[];
  guardrail: string;
};

export const studioPoc = {
  imageBuilder: {
    provider: 'kopano.deterministic-image-poc',
    sourceAssetId: 'jennifer.evidence.companion-matrix.01',
    prompt: 'Create one governed visual variation while preserving Project: JENNIFER lineage.',
    variationAssetIds: [
      'jennifer.studio.image.poc.01',
      'jennifer.studio.image.poc.02',
      'jennifer.studio.image.poc.03',
    ],
    selectedAssetId: 'jennifer.studio.image.poc.01',
    receiptId: 'kc:studio:image:2026-08-16:001',
  },
  motionLab: {
    provider: 'kopano.deterministic-motion-poc',
    sourceAssetId: 'jennifer.evidence.companion-matrix.01',
    region: { x: 0.58, y: 0.16, width: 0.28, height: 0.54 },
    instruction: 'Animate only the selected region; preserve the canonical source outside the mask.',
    outputAssetId: 'jennifer.studio.motion.poc.01',
    parentAssetId: 'jennifer.evidence.companion-matrix.01',
    receiptId: 'kc:studio:motion:2026-08-16:001',
  },
} as const;

export const entertainmentPoc = {
  gameCenter: ['jennifer', 'starfall'] as const,
  crossMediaGraph: [
    'Protocol 13',
    'Project Y',
    'Project: JENNIFER',
    'AMA-PHU Music Artwork',
    'Owned Merchandise',
  ] as const,
  receiptId: 'kc:entertainment:graph:2026-08-16:001',
} as const;

export const commercePoc = {
  adapterId: 'kopanolabs.shop',
  mode: 'bounded-sandbox',
  sourceAssetId: 'kopano.brand.primary-mark.v1',
  product: {
    id: 'kopano-mark-decal-v1',
    title: 'Kopano Labs Mark — governed merchandise proof',
    currency: 'ZAR',
    unitAmountMinor: 15000,
    deepLinkOrigin: 'https://kopanolabs.shop',
    deepLinkPath: '/products/kopano-mark-decal-v1',
  },
  orderReceiptContract: {
    required: ['orderId', 'productId', 'amountMinor', 'currency', 'provider', 'occurredAt', 'kcReceiptId'] as const,
  },
} as const;

export const creatorEconomyPoc = {
  contributorIdentity: {
    contributorId: 'founder:first-party',
    identityState: 'declared-first-party',
  },
  ownershipDeclaration: {
    namespace: 'kopano-labs.creator-proof',
    basis: 'first-party-generated',
  },
  submissionReceiptId: 'kc:create:submission:2026-08-16:001',
  moderationDecision: 'ALLOW',
  approvedDerivativePath: 'canonical submission -> approved derivative -> OWN surface',
  payoutModel: {
    model: 'net-revenue-share-bps',
    contributorShareBps: 7000,
    platformShareBps: 3000,
  },
} as const;

export const serviceDeliveryPoc = {
  lane: 'South African government services discovery',
  source: {
    authority: 'South African Government',
    url: 'https://www.gov.za/services',
  },
  relevanceRule: 'resident + education-and-training interest -> resident services entry point',
  delivery: {
    title: 'Government services for residents',
    actionUrl: 'https://www.gov.za/services-residents',
  },
  actionReceipt: {
    receiptId: 'kc:service-delivery:fixture:2026-08-16:001',
    mode: 'poc-fixture',
    observedRealUserOutcome: false,
  },
} as const;

function assetReady(assetId: string, surface: 'play' | 'create' | 'own' | 'hub-header') {
  const asset = assetById(assetId);
  return Boolean(asset && canDistribute(asset, surface));
}

function surfaceExists(id: string) {
  return sovereignSurfaces.some((surface) => surface.id === id);
}

export function evaluateBacklogProofs(): BacklogProofReceipt[] {
  const studioSourceReady = assetReady(studioPoc.imageBuilder.sourceAssetId, 'create');
  const studioLineageValid = studioPoc.motionLab.parentAssetId === studioPoc.motionLab.sourceAssetId;

  const entertainmentReady = entertainmentPoc.gameCenter.every(surfaceExists)
    && entertainmentPoc.crossMediaGraph.length === 5;

  const commerceCodePathReady = assetReady(commercePoc.sourceAssetId, 'own')
    && commercePoc.product.currency === 'ZAR'
    && commercePoc.orderReceiptContract.required.includes('kcReceiptId');
  const commerceReceipts = validatedCommerceReceipts();

  const creatorCodePathReady = creatorEconomyPoc.moderationDecision === 'ALLOW'
    && creatorEconomyPoc.payoutModel.contributorShareBps + creatorEconomyPoc.payoutModel.platformShareBps === 10000;
  const creatorPayoutReceipts = validatedCreatorPayoutReceipts();

  const serviceLaneReady = serviceDeliveryPoc.source.url.startsWith('https://www.gov.za/')
    && serviceDeliveryPoc.delivery.actionUrl.startsWith('https://www.gov.za/')
    && serviceDeliveryPoc.actionReceipt.mode === 'poc-fixture';

  const governedAssetIds = [
    'kopano.brand.primary-mark.v1',
    'jennifer.evidence.companion-matrix.01',
    'jennifer.evidence.companion-matrix.02',
    'jennifer.evidence.companion-matrix.03',
  ];
  const assetIngestReady = governedAssetIds.every((assetId) => {
    const asset = assetById(assetId);
    return Boolean(
      asset
      && asset.role === 'canonical'
      && asset.approval === 'approved'
      && asset.classification === 'confirmed'
      && asset.availability === 'ingested'
      && asset.lineage.sourceReference.startsWith('github://'),
    );
  });

  return [
    {
      issue: 5,
      sprint: 'Sprint 03',
      title: 'Sovereign Studio',
      state: studioSourceReady && studioLineageValid ? 'PASS' : 'FAIL',
      receiptId: studioPoc.motionLab.receiptId,
      path: 'source -> prompt -> variations -> select -> receipt -> lineage; canonical asset -> mask -> motion instruction -> receipt -> derivative lineage',
      evidence: [studioPoc.imageBuilder.receiptId, studioPoc.motionLab.receiptId, studioPoc.imageBuilder.provider, studioPoc.motionLab.provider],
      guardrail: 'Deterministic provider POC validates orchestration and receipts; it does not claim production media-generation quality.',
    },
    {
      issue: 6,
      sprint: 'Sprint 04',
      title: 'Entertainment Distribution',
      state: entertainmentReady ? 'PASS' : 'FAIL',
      receiptId: entertainmentPoc.receiptId,
      path: 'two-game launch registry + one five-node canonical cross-media lineage graph',
      evidence: [...entertainmentPoc.gameCenter, ...entertainmentPoc.crossMediaGraph],
      guardrail: 'Catalogue breadth is intentionally bounded to declared first-party/governed surfaces.',
    },
    {
      issue: 7,
      sprint: 'Sprint 05',
      title: 'Commerce / OWN',
      state: commerceCodePathReady && commerceReceipts.length > 0 ? 'PASS' : commerceCodePathReady ? 'EXTERNAL_GATE' : 'FAIL',
      receiptId: commerceReceipts[0]?.kcReceiptId ?? 'kc:commerce:contract:2026-08-16:001',
      path: 'canonical asset -> governed product -> deep-link boundary -> external order receipt -> KC receipt',
      evidence: [commercePoc.adapterId, commercePoc.product.id, ...commercePoc.orderReceiptContract.required, ...commerceReceipts.flatMap((receipt) => [receipt.providerReceiptId, receipt.kcReceiptId])],
      guardrail: 'PASS requires a typed, validated, completed production-provider order receipt bound to a canonical KC receipt. Fixtures, sandbox objects and unpaid invoices are rejected.',
    },
    {
      issue: 8,
      sprint: 'Sprint 06',
      title: 'Creator Economy / CREATE + EARN',
      state: creatorCodePathReady && creatorPayoutReceipts.length > 0 ? 'PASS' : creatorCodePathReady ? 'EXTERNAL_GATE' : 'FAIL',
      receiptId: creatorPayoutReceipts[0]?.kcReceiptId ?? creatorEconomyPoc.submissionReceiptId,
      path: 'identity -> ownership declaration -> submission receipt -> KC moderation -> approved derivative -> payout receipt',
      evidence: [creatorEconomyPoc.contributorIdentity.contributorId, creatorEconomyPoc.moderationDecision, creatorEconomyPoc.approvedDerivativePath, ...creatorPayoutReceipts.flatMap((receipt) => [receipt.providerReceiptId, receipt.kcReceiptId])],
      guardrail: 'PASS requires a typed, validated, paid production-provider payout receipt bound to a canonical KC receipt whose amounts reconcile to the governed 70/30 split.',
    },
    {
      issue: 9,
      sprint: 'Sprint 07',
      title: 'Public Service Delivery',
      state: serviceLaneReady ? 'PASS' : 'FAIL',
      receiptId: serviceDeliveryPoc.actionReceipt.receiptId,
      path: 'official source -> governed bounded record -> relevance rule -> delivery -> action receipt contract',
      evidence: [serviceDeliveryPoc.source.url, serviceDeliveryPoc.delivery.actionUrl, serviceDeliveryPoc.relevanceRule],
      guardrail: 'Fixture proves the lane contract only; observed user telemetry is required before any employment or impact claim.',
    },
    {
      issue: 14,
      sprint: 'Sprint 02 validation',
      title: 'Image evidence ingestion receipt',
      state: assetIngestReady ? 'PASS' : 'FAIL',
      receiptId: 'kc:asset-ingest:2026-08-16:001',
      path: 'preserved first-party binary -> verified fingerprint -> canonical cross-repo URI -> approved registry state',
      evidence: governedAssetIds,
      guardrail: 'Only first-party governed repository URIs are promoted; chat evidence and third-party references remain non-distributable.',
    },
  ];
}
