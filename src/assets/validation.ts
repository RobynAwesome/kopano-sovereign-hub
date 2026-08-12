import type { AssetSurface, AssetValidationResult, SovereignAsset } from './contract';
import { assetById, sovereignAssetRegistry } from './registry';

const sha256Pattern = /^[a-f0-9]{64}$/;

export function validateAsset(asset: SovereignAsset): AssetValidationResult {
  const violations: string[] = [];

  if (!sha256Pattern.test(asset.fingerprint.value)) {
    violations.push('fingerprint must be a lowercase 64-character SHA-256 hex value');
  }

  if ((asset.media.mediaType.startsWith('image/') || asset.media.mediaType.startsWith('video/')) && (!asset.media.width || !asset.media.height)) {
    violations.push('visual assets require width and height metadata');
  }

  if (asset.role === 'reference' && asset.allowedSurfaces.length > 0) {
    violations.push('reference assets cannot declare distribution surfaces');
  }

  if (asset.approval === 'reference-only' && asset.allowedSurfaces.length > 0) {
    violations.push('reference-only evidence cannot be distributed');
  }

  if (asset.lineage.parentAssetId && !assetById(asset.lineage.parentAssetId)) {
    violations.push('derivative parent asset does not exist in registry');
  }

  if (asset.availability === 'derived' && !asset.lineage.parentAssetId) {
    violations.push('derived assets require a parent asset ID');
  }

  if (asset.classification === 'provisional' && asset.approval === 'approved') {
    violations.push('provisional classification cannot be approved');
  }

  return {
    assetId: asset.id,
    valid: violations.length === 0,
    violations,
  };
}

export function canDistribute(asset: SovereignAsset, surface: AssetSurface) {
  if (asset.role === 'reference') return false;
  if (asset.approval !== 'approved') return false;
  if (asset.availability !== 'ingested' && asset.availability !== 'derived') return false;
  if (asset.classification !== 'confirmed') return false;
  return asset.allowedSurfaces.includes(surface);
}

export function validateRegistry() {
  const ids = new Set<string>();
  const results = sovereignAssetRegistry.map((asset) => {
    const result = validateAsset(asset);
    if (ids.has(asset.id)) {
      result.valid = false;
      result.violations.push('duplicate canonical asset ID');
    }
    ids.add(asset.id);
    return result;
  });

  return {
    valid: results.every((result) => result.valid),
    results,
  };
}

export const assetRegistryProof = {
  registry: validateRegistry(),
  cases: [
    {
      name: 'evidence-only brand candidate is not distributable yet',
      passed: canDistribute(sovereignAssetRegistry[0], 'hub-header') === false,
    },
    {
      name: 'third-party game reference is never distributable',
      passed: canDistribute(sovereignAssetRegistry[2], 'play') === false,
    },
    {
      name: 'provisional Jennifer evidence cannot ship before confirmation and ingest',
      passed: canDistribute(sovereignAssetRegistry[5], 'play') === false,
    },
  ],
};
