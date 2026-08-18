import registry from '../../governance/experiments.json';

export type ExperimentRelation = 'experiment' | 'validation-input' | 'evidence-surface';

export type ExperimentNode = {
  id: string;
  name: string;
  lane: string;
  relation: ExperimentRelation;
  lifecycle: 'PLANT' | 'WATER' | 'PRUNE' | 'HARVEST' | 'FRUIT' | null;
  state: string;
  repo: string | null;
  publicSurface: string | null;
  declaredDomain?: string;
  backing: string;
  description: string;
};

export type ExperimentRegistry = {
  schema: string;
  snapshotDate: string;
  authority: {
    constitutional: string;
    runtime: string;
    publicEvidence: string;
    repoNamespace: string;
  };
  laws: {
    renterAssertion: string;
    claimDefault: string;
    realityIndex: string;
    promotion: string;
    convergence: string;
  };
  publicProjection: {
    consumer: string;
    policy: string;
    relationSourceOwned: boolean;
    privateContext: string;
    commercialTerms: string;
    rule: string;
  };
  legacyLifecycle: {
    source: string;
    phases: string[];
    note: string;
  };
  nodes: ExperimentNode[];
};

export const governedExperimentRegistry = registry as ExperimentRegistry;
export const governedExperimentNodes = governedExperimentRegistry.nodes;

export const experimentStateTone = (state: string) => {
  if (['VALIDATED_LIVE', 'VALIDATED_FIELD', 'DELIVERED_EXTERNAL', 'LIVE', 'PUBLIC'].includes(state)) return 'pass';
  if (['FIELD', 'BUILD', 'POC', 'GOVERNED_EXTERNAL'].includes(state)) return 'building';
  if (['REWORK', 'TARGET'].includes(state)) return 'review';
  return 'maybe';
};
