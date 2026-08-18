import { useMemo, useState, type CSSProperties } from 'react';
import { evaluateAdapterProofCases } from './adapters/proof';
import { governedExperimentNodes, governedExperimentRegistry, experimentStateTone, type ExperimentNode } from './data/experiments';
import { integrationCandidates, sovereignSurfaces, type SovereignSurface } from './data/registry';
import { evaluateSurface, readRuntimeSignals } from './lib/kc';
import { evaluateBacklogProofs } from './poc/backlogProof';

const doors = ['READ', 'PLAY', 'WATCH', 'LISTEN', 'OWN', 'CREATE'] as const;
type Door = (typeof doors)[number];

const doorForSurface = (surface: SovereignSurface): Door => {
  if (surface.kind === 'story') return 'READ';
  if (surface.kind === 'game') return 'PLAY';
  if (surface.kind === 'anime') return 'WATCH';
  if (surface.kind === 'music') return 'LISTEN';
  if (surface.kind === 'service') return 'CREATE';
  return 'OWN';
};

function SurfaceCard({ surface, onInspect }: { surface: SovereignSurface; onInspect: (surface: SovereignSurface) => void }) {
  const decision = evaluateSurface(surface);
  return (
    <button className="surface-card" onClick={() => onInspect(surface)} style={{ '--accent': surface.accent } as CSSProperties}>
      <div className="surface-card__art" aria-hidden="true"><span>{doorForSurface(surface)}</span></div>
      <div className="surface-card__topline">
        <span className="surface-card__kind">{surface.kind}</span>
        <span className={`gate gate--${decision.gate.toLowerCase()}`}>{decision.gate}</span>
      </div>
      <h3>{surface.name}</h3>
      <p>{surface.description}</p>
      <div className="surface-card__meta"><span>{surface.owner}</span><span>{surface.status}</span></div>
    </button>
  );
}

const experimentAccent = (node: ExperimentNode) => {
  if (node.lifecycle === 'PLANT') return '#7bf59b';
  if (node.lifecycle === 'WATER') return '#45d6ff';
  if (node.lifecycle === 'PRUNE') return '#8f7cff';
  if (node.lifecycle === 'HARVEST') return '#ffb347';
  return '#f2f4f8';
};

function ExperimentCard({ node }: { node: ExperimentNode }) {
  const tone = experimentStateTone(node.state);
  return (
    <article className="surface-card experiment-card" style={{ '--accent': experimentAccent(node) } as CSSProperties}>
      <div className="surface-card__art" aria-hidden="true"><span>{node.lifecycle ?? 'EXT'}</span></div>
      <div className="surface-card__topline">
        <span className="surface-card__kind">{node.lane}</span>
        <span className={`gate gate--${tone}`}>{node.state}</span>
      </div>
      <h3>{node.name}</h3>
      <p>{node.description}</p>
      <small className="experiment-backing">{node.backing}</small>
      <div className="experiment-links">
        {node.publicSurface && <a href={node.publicSurface} target="_blank" rel="noreferrer">Open surface ↗</a>}
        {node.repo && <a href={node.repo} target="_blank" rel="noreferrer">Source ↗</a>}
        {!node.publicSurface && !node.repo && <span>MAYBE · binding receipt required</span>}
      </div>
    </article>
  );
}

export default function App() {
  const [selected, setSelected] = useState<SovereignSurface>(sovereignSurfaces[0]);
  const [activeDoor, setActiveDoor] = useState<Door | 'ALL'>('ALL');
  const [showIntegrations, setShowIntegrations] = useState(false);
  const signals = useMemo(() => readRuntimeSignals(), []);
  const adapterProof = useMemo(() => evaluateAdapterProofCases(), []);
  const backlogProofs = useMemo(() => evaluateBacklogProofs(), []);
  const proofPassed = adapterProof.filter((proofCase) => proofCase.passed).length;
  const backlogPassed = backlogProofs.filter((proof) => proof.state === 'PASS').length;
  const selectedDecision = evaluateSurface(selected);
  const filtered = activeDoor === 'ALL' ? sovereignSurfaces : sovereignSurfaces.filter((surface) => doorForSurface(surface) === activeDoor);
  const externallyValidated = governedExperimentNodes.filter((node) => ['VALIDATED_LIVE', 'VALIDATED_FIELD', 'DELIVERED_EXTERNAL'].includes(node.state)).length;

  return (
    <main className="app-shell">
      <div className="grid-glow" aria-hidden="true" />
      <header className="topbar">
        <div>
          <span className="eyebrow">Kopano-Phu sovereign runtime</span>
          <h1>Kopano Sovereign Hub</h1>
        </div>
        <div className="runtime-pill"><span className={signals.online ? 'pulse pulse--live' : 'pulse pulse--warn'} />{signals.online ? 'ONLINE' : 'OFFLINE'} · APWA + .NET</div>
      </header>

      <section className="hero hero--consumer">
        <div className="hero__copy">
          <span className="hero__tag">Worlds. Systems. Field experiments. One governed runtime.</span>
          <h2>Run the experiments. Keep the constitution outside the renter.</h2>
          <p>Kopano Sovereign Hub is the runtime projection for first-party worlds and KPGS governance experiments. Introduction-to-MCP / MAIN-BRAIN remains constitutional authority; the Hub routes, observes and returns receipts.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span>K</span></div>
      </section>

      <nav className="door-grid" aria-label="Primary Hub actions">
        {doors.map((door) => (
          <button key={door} className={activeDoor === door ? 'door door--active' : 'door'} onClick={() => setActiveDoor(activeDoor === door ? 'ALL' : door)}>
            <span>{door}</span><small>{door === 'READ' ? 'manga + canon' : door === 'PLAY' ? 'games + sims' : door === 'WATCH' ? 'anime + video' : door === 'LISTEN' ? 'music + audio' : door === 'OWN' ? 'collect + commerce' : 'studio + contribution'}</small>
          </button>
        ))}
      </nav>

      <section className="catalogue catalogue--consumer">
        <div className="section-heading"><div><span className="eyebrow">consumer + creator distribution</span><h2>{activeDoor === 'ALL' ? 'Explore the worlds' : activeDoor}</h2></div><span className="count">{filtered.length} surfaces</span></div>
        <div className="card-grid card-grid--media">{filtered.map((surface) => <SurfaceCard key={surface.id} surface={surface} onInspect={setSelected} />)}</div>
      </section>

      <section className="catalogue governance-experiments" aria-labelledby="governance-experiments-title">
        <div className="section-heading">
          <div><span className="eyebrow">KPGS · GOVERNANCE SYSTEMS EXPERIMENTS</span><h2 id="governance-experiments-title">One hub. Different realities.</h2></div>
          <span className="count">{governedExperimentNodes.length} nodes · {externallyValidated} external receipts</span>
        </div>
        <p className="registry-law">{governedExperimentRegistry.laws.renterAssertion} · {governedExperimentRegistry.laws.realityIndex}</p>
        <div className="card-grid card-grid--media">{governedExperimentNodes.map((node) => <ExperimentCard key={node.id} node={node} />)}</div>
      </section>

      <details className="governance-drawer">
        <summary>Governance & runtime details</summary>
        <div className="governance-drawer__grid">
          <div><span>Selected world</span><strong>{selected.name}</strong></div>
          <div><span>KC Gate</span><strong>{selectedDecision.gate} · {selectedDecision.score}</strong></div>
          <div><span>Experiment nodes</span><strong>{governedExperimentNodes.length}</strong></div>
          <div><span>Registry snapshot</span><strong>{governedExperimentRegistry.snapshotDate}</strong></div>
          <div><span>TypeScript</span><strong>7.0</strong></div>
          <div><span>WebGL2</span><strong>{signals.webgl2 ? 'READY' : 'FALLBACK'}</strong></div>
          <div><span>Service Worker</span><strong>{signals.serviceWorker ? 'READY' : 'NO'}</strong></div>
          <div><span>Adapter Proof</span><strong>{proofPassed}/{adapterProof.length} PASS</strong></div>
          <div><span>Backlog Proof</span><strong>{backlogPassed}/{backlogProofs.length} PASS</strong></div>
        </div>
        <div className="reason-list">{selectedDecision.reasons.map((reason) => <span key={reason}>◆ {reason}</span>)}</div>
        <div className="reason-list" aria-label="Sprint backlog proof receipts">
          {backlogProofs.map((proof) => (
            <span key={proof.issue}>#{proof.issue} · {proof.state} · {proof.title} · {proof.receiptId}</span>
          ))}
        </div>
        <div className="reason-list" aria-label="Experiment governance laws">
          <span>Constitution · {governedExperimentRegistry.authority.constitutional}</span>
          <span>Promotion · {governedExperimentRegistry.laws.promotion}</span>
          <span>Convergence · {governedExperimentRegistry.laws.convergence}</span>
        </div>
        <button className="secondary" onClick={() => setShowIntegrations((value) => !value)}>{showIntegrations ? 'Hide external adapters' : 'Inspect external adapters'}</button>
        {showIntegrations && <div className="integration-strip">{integrationCandidates.map((surface) => <SurfaceCard key={surface.id} surface={surface} onInspect={setSelected} />)}</div>}
      </details>

      <footer><span>Kopano Sovereign Hub · Runtime projection, not constitutional landlord</span><span>signal → experiment → governance → receipt → public evidence</span></footer>
    </main>
  );
}
