import type { SovereignSurface } from '../data/registry';

export type KcDecision = {
  allowed: boolean;
  score: number;
  reasons: string[];
  gate: 'ALLOW' | 'REVIEW' | 'BLOCK';
};

export function evaluateSurface(surface: SovereignSurface): KcDecision {
  let score = 100;
  const reasons: string[] = [];

  if (surface.trust === 'external') {
    score -= 35;
    reasons.push('External trust boundary requires explicit adapter policy.');
  }

  if (surface.mode === 'gateway') {
    score -= 15;
    reasons.push('Gateway execution requires server-side mediation and scoped credentials.');
  }

  if (surface.status === 'planned') {
    score -= 20;
    reasons.push('Surface is declared but not yet proven by a working adapter.');
  }

  if (surface.trust === 'first-party') {
    reasons.push('First-party surface can inherit Kopano-Phu governance defaults.');
  }

  if (surface.mode === 'local-first') {
    reasons.push('Local-first execution increases resilience when connectivity degrades.');
  }

  const gate: KcDecision['gate'] = score >= 75 ? 'ALLOW' : score >= 45 ? 'REVIEW' : 'BLOCK';

  return {
    allowed: gate === 'ALLOW',
    score,
    reasons,
    gate,
  };
}

export function readRuntimeSignals() {
  const canvas = document.createElement('canvas');
  const webgl2 = Boolean(canvas.getContext('webgl2'));
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  return {
    online: navigator.onLine,
    serviceWorker: 'serviceWorker' in navigator,
    webgl2,
    standalone,
    platform: navigator.platform || 'web',
  };
}
