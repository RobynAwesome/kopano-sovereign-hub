export type AssetRole = 'canonical' | 'candidate' | 'reference';
export type AssetApprovalState = 'candidate' | 'approved' | 'rejected' | 'reference-only';
export type AssetClassification = 'confirmed' | 'provisional';
export type AssetAvailability = 'evidence-only' | 'ingested' | 'derived';
export type AssetMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'audio/mpeg';
export type AssetSurface =
  | 'hub-header'
  | 'hub-splash'
  | 'read'
  | 'play'
  | 'watch'
  | 'listen'
  | 'own'
  | 'create'
  | 'open-graph'
  | 'governance-receipt';

export type AssetOwner = {
  name: string;
  organization?: 'Kopano Labs' | 'AMA-PHU Entertainment' | 'Unclassified';
  ownershipBasis: 'user-declared' | 'first-party-generated' | 'third-party-reference' | 'pending-confirmation';
};

export type AssetFingerprint = {
  algorithm: 'sha256';
  value: string;
};

export type AssetMediaMetadata = {
  mediaType: AssetMediaType;
  width?: number;
  height?: number;
  byteLength?: number;
};

export type AssetLineage = {
  parentAssetId?: string;
  sourceReference: string;
  derivativePurpose?: string;
};

export type SovereignAsset = {
  id: string;
  title: string;
  namespace: string;
  role: AssetRole;
  approval: AssetApprovalState;
  classification: AssetClassification;
  availability: AssetAvailability;
  owner: AssetOwner;
  fingerprint: AssetFingerprint;
  media: AssetMediaMetadata;
  lineage: AssetLineage;
  allowedSurfaces: AssetSurface[];
  notes: string[];
};

export type AssetValidationResult = {
  assetId: string;
  valid: boolean;
  violations: string[];
};
