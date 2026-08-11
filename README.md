# Kopano Sovereign Hub

**Kopano Sovereign Hub** is the governed distribution surface for the Kopano-Phu ecosystem: entertainment, games, music, sovereign applications, external integrations, and eventually service-delivery interfaces.

This repository starts with a strict rule: **prove the smallest usable surface before expanding the platform.**

## Phase 0 — Truth Lock

The first proof of concept is a TypeScript 7 web application that demonstrates:

- an Adaptive Progressive Web App shell;
- KC-governed product and integration cards;
- local/offline-aware execution states;
- explicit API trust boundaries;
- entertainment distribution surfaces for Protocol 13, Project: JENNIFER, Project Y, Starfall Salvage, music, and future AMA-PHU releases;
- a staged path toward rigid .NET integration gateways rather than uncontrolled third-party embedding.

## Governance rule

A browser app cannot safely or reliably absorb arbitrary Chrome/Edge extensions or third-party websites as if they were native modules. Integrations therefore enter through declared adapters, OAuth/deep links, supported web APIs, or governed backend gateways. KC owns the policy decision; adapters own transport.

## Build sequence

`PR1 -> PRx`

PR1 establishes the TypeScript 7 APWA proof, architecture contracts, product registry, KC governance membrane, and Vercel-ready build.

See `plans/` and `docs/` as the repository grows.
