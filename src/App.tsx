import { useMemo, useState } from 'react';
import { integrationCandidates, sovereignSurfaces, type SovereignSurface } from './data/registry';
import { evaluateSurface, readRuntimeSignals } from './lib/kc';

function SurfaceCard({ surface, onInspect }: { surface: SovereignSurface; onInspect: (surface: SovereignSurface) => void }) {
  const decision = evaluateSurface(surface);

  return (
    <button className="surface-card" onClick={() => onInspect(surface)} style={{ '--accent': surface.accent } as React.CSSProperties}>
      <div className="surface-card__topline">
        <span className="surface-card__kind">{surface.kind}</span>
        <span className={`gate gate--${decision.gate.toLowerCase()}`}>{decision.gate}</span>
      </div>
      <h3>{surface.name}</h3>
      <p>{surface.description}</p>
      <div className="surface-card__meta">
        <span>{surface.owner}</span>
        <span>{surface.mode}</span>
      </div>
    </button>
  );
}

export default function App() {
  const [selected, setSelected] = useState<SovereignSurface | null>(sovereignSurfaces[0]);
  const [lane, setLane] = useState<'ecosystem' | 'integrations'>('ecosystem');
  const signals = useMemo(() => readRuntimeSignals(), []);
  const cards = lane === 'ecosystem' ? sovereignSurfaces : integrationCandidates;
  const selectedDecision = selected ? evaluateSurface(selected) : null;

  return (
    <main className="app-shell">
      <div className="grid-glow" aria-hidden="true" />
      <header className="topbar">
        <div>
          <span className="eyebrow">KPGS / governed distribution surface</span>
          <h1>Kopano Sovereign Hub</h1>
        </div>
        <div className="runtime-pill">
          <span className={signals.online ? 'pulse pulse--live' : 'pulse pulse--warn'} />
          {signals.online ? 'ONLINE' : 'OFFLINE'} · APWA
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <span className="hero__tag">KC governs. Users choose. Adapters execute.</span>
          <h2>One sovereign shell for stories, games, music, services and trusted external tools.</h2>
          <p>
            PR1 proves the membrane: first-party products live inside one adaptive launcher while external platforms remain behind explicit trust gates.
          </p>
          <div className="hero__actions">
            <button className="primary" onClick={() => setLane('ecosystem')}>Open ecosystem</button>
            <button className="secondary" onClick={() => setLane('integrations')}>Inspect integrations</button>
          </div>
        </div>
        <div className="hero__telemetry">
          <div><span>TypeScript</span><strong>7.0</strong></div>
          <div><span>WebGL2</span><strong>{signals.webgl2 ? 'READY' : 'FALLBACK'}</strong></div>
          <div><span>Service Worker</span><strong>{signals.serviceWorker ? 'READY' : 'NO'}</strong></div>
          <div><span>Install Mode</span><strong>{signals.standalone ? 'APP' : 'BROWSER'}</strong></div>
        </div>
      </section>

      <section className="workspace">
        <aside className="dock">
          <span className="dock__label">Sovereign Dock</span>
          <button className={lane === 'ecosystem' ? 'active' : ''} onClick={() => setLane('ecosystem')}>◎ Products</button>
          <button className={lane === 'integrations' ? 'active' : ''} onClick={() => setLane('integrations')}>⌘ Integrations</button>
          <div className="dock__rule" />
          <span className="dock__small">Chromium-class web runtime</span>
          <span className="dock__small">.NET gateway: PR2+</span>
        </aside>

        <div className="catalogue">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{lane === 'ecosystem' ? 'first-party distribution' : 'governed adapter candidates'}</span>
              <h2>{lane === 'ecosystem' ? 'Kopano-Phu surfaces' : 'External capability lane'}</h2>
            </div>
            <span className="count">{cards.length} surfaces</span>
          </div>
          <div className="card-grid">
            {cards.map((surface) => <SurfaceCard key={surface.id} surface={surface} onInspect={setSelected} />)}
          </div>
        </div>
      </section>

      {selected && selectedDecision && (
        <section className="kc-panel">
          <div>
            <span className="eyebrow">KC decision membrane</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
          </div>
          <div className="score-ring" style={{ '--score': `${selectedDecision.score * 3.6}deg` } as React.CSSProperties}>
            <strong>{selectedDecision.score}</strong>
            <span>{selectedDecision.gate}</span>
          </div>
          <div className="reason-list">
            {selectedDecision.reasons.map((reason) => <span key={reason}>◆ {reason}</span>)}
          </div>
        </section>
      )}

      <footer>
        <span>Kopano Sovereign Hub · PR1 proof</span>
        <span>Reality &gt; presentation · POC &gt; FOC</span>
      </footer>
    </main>
  );
}
