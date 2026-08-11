# 001 — PR + Sprint Roadmap

## Delivery rule

Kopano Sovereign Hub advances by bounded pull requests grouped into short proof-oriented sprints. A sprint may contain multiple PRs, but every PR must prove one thing, expose its validation receipt, and avoid claiming later-stage capabilities early.

## Sprint 0 — Truth Lock — COMPLETE

### PR1 — TypeScript 7 APWA sovereign shell
Status: merged.

Proved:
- installable APWA shell;
- KC allow/review/block membrane;
- first-party and external trust boundaries;
- runtime capability telemetry;
- Vercel deployment and TypeScript 7 build validation.

---

## Sprint 1 — Governance Transport

### PR2 — Universal Sovereign Adapter Contract — ACTIVE
Topic: controlled integration.

Deliver:
- typed adapter identity and capability declarations;
- read/write scopes;
- permission and consent state;
- KC request decision;
- execution receipt;
- revocation path;
- provider-neutral contract before Google, Microsoft, Spotify, government or other external APIs are connected.

Exit gate:
`request -> KC decision -> execute/mock -> immutable receipt -> revoke`

### PR3 — First rigid gateway proof
Topic: .NET boundary.

Deliver:
- one external provider only;
- server-side credential isolation;
- request validation;
- rate limiting;
- receipt hand-off to KC;
- no general-purpose provider mesh yet.

---

## Sprint 2 — Canonical Assets + Visual Identity

### PR4 — Sovereign Asset Registry
Topic: image/media lineage.

Deliver:
- canonical asset IDs;
- owner and IP namespace;
- source/derivative relationship;
- content hash;
- approval state;
- media type and dimensions;
- project linkage across Protocol 13, Project: JENNIFER, Project Y, Starfall Salvage and AMA-PHU Music.

Use the user-supplied Kopano Labs mark as the first canonical brand asset. Earlier Hub, workstation, game-discovery and creator-tool screenshots remain design/evidence references rather than copied third-party production UI.

### PR5 — Consumer visual shell
Topic: media-first UX.

Move from `system -> cards -> governance` toward `world -> media -> action -> governance when needed`.

Primary user doors:
- READ;
- PLAY;
- WATCH;
- LISTEN;
- OWN;
- CREATE.

KC telemetry remains available but is no longer the dominant consumer surface.

---

## Sprint 3 — Sovereign Studio

### PR6 — Image Builder POC
Topic: prompt/source asset -> governed visual output.

Prove:
`source -> prompt -> provider adapter -> variations -> select -> receipt -> asset registry`

No multi-provider abstraction until one provider works end to end.

### PR7 — Motion Lab POC
Topic: image region + motion instruction -> governed video derivative.

Prove:
`canonical asset -> region/mask -> motion instruction -> provider -> output -> receipt -> derivative link`

---

## Sprint 4 — Entertainment Distribution

### PR8 — AMA-PHU Game Center
Topic: instant consumer play.

Start with:
- Project: JENNIFER;
- Starfall Salvage;
- 5S Arena when its adapter is ready.

Interaction target: deep machinery underneath, extremely simple discovery and launch above.

### PR9 — Cross-Media Graph
Topic: one IP object across many media.

Example lineage:
`Protocol 13 -> canonical character -> Project Y -> Project: JENNIFER -> music art -> merchandise`

---

## Sprint 5 — Commerce

### PR10 — OWN / KopanoLabs.shop adapter
Topic: digital IP -> physical product.

Prove one bounded product flow:
`asset -> product -> cart/deep link -> order receipt`

Do not build a universal dropshipping engine first.

---

## Sprint 6 — Creator Economy

### PR11 — CREATE / EARN
Topic: governed creator contribution.

Candidate contribution classes:
- art;
- music;
- manga assets;
- animation;
- game assets;
- merchandise designs.

Required before money claims:
- contributor identity;
- ownership declaration;
- submission receipt;
- moderation/governance decision;
- payout model proven on at least one real transaction.

---

## Sprint 7 — Public Service Delivery

### PR12 — Service Delivery Lane POC
Topic: opportunity and public-information delivery.

Start with one measurable service path only.

Validation must measure actual delivery outcomes rather than assuming unemployment impact.

---

## Sprint governance

Every PR must contain:
1. hypothesis;
2. bounded scope;
3. explicit non-claims;
4. implementation;
5. telemetry/receipt;
6. failure notes;
7. next gate.

No sprint advances because a feature is theoretically possible. It advances because the prior proof survives contact with reality.
