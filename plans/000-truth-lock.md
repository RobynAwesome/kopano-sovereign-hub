# 000 — Truth Lock

## Problem

Kopano-Phu owns and experiments with multiple digital products, entertainment properties and governance systems. The immediate risk is not lack of ideas; it is uncontrolled expansion without a single governed distribution surface.

## PR1 hypothesis

A lightweight APWA can act as the user-facing hub while KC governs which first-party and external surfaces may execute.

## What PR1 proves

1. One launcher can represent games, manga, anime, music and service-delivery lanes.
2. The runtime can adapt to basic client capabilities such as connectivity, install mode, WebGL2 and service-worker support.
3. Every surface can carry explicit owner, execution mode, trust state and lifecycle status.
4. KC can make a visible allow/review/block decision before an adapter executes.
5. The app can be deployed as a normal web application without an app-store dependency.

## What PR1 intentionally does not claim

- It does not embed Chromium itself. Chrome/Edge already provide the browser engine; the PWA uses standards exposed by that runtime.
- It does not import arbitrary Chrome/Edge extensions into the website. Browser extensions are separately privileged software.
- It does not yet connect Google, Microsoft, Spotify, YouTube, government systems or other external providers.
- It does not yet implement the .NET gateway.
- It does not claim service-delivery impact or unemployment reduction until telemetry exists.

## Next gates

### PR2 — Adapter contract
Define authentication, scopes, permissions, data minimisation, rate limits and revocation.

### PR3 — Rigid gateway
Build the first .NET gateway service for one external provider only.

### PR4 — Entertainment proof
Connect one real AMA-PHU/Kopano property and measure actual usage.

### PR5 — Offline proof
Cache one bounded first-party experience and validate degraded-network behaviour.

## Validation rule

No integration advances because it is theoretically possible. It advances only after a working adapter, observable telemetry and an explicit KC governance decision.
