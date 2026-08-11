# Kopano Sovereign Hub — Architecture v0

```text
User
  |
  v
APWA Shell (TypeScript 7 / React)
  |
  +--> First-party surface registry
  |      +--> Project: JENNIFER
  |      +--> Protocol 13
  |      +--> Project Y
  |      +--> Starfall Salvage
  |      +--> AMA-PHU Music
  |
  +--> KC Governance Membrane
  |      +--> owner
  |      +--> trust boundary
  |      +--> execution mode
  |      +--> lifecycle state
  |      +--> allow / review / block
  |
  +--> Adapter Contract (PR2)
          |
          +--> .NET rigid gateway (PR3+)
          |      +--> OAuth / scoped credentials
          |      +--> request validation
          |      +--> rate limits
          |      +--> telemetry receipts
          |
          +--> Supported external APIs
```

## Chromium relationship

The hub targets Chromium-class browsers because Chrome and Edge expose strong PWA, service-worker, WebGL and modern Web Platform capabilities. The website itself does **not** ship or control the Chromium engine. Deeper browser-engine work would require a separately packaged browser, WebView host, extension, or native shell and is therefore a different proof of concept.

## Extension relationship

Chrome/Edge extensions are privileged browser packages and cannot be treated as ordinary website plugins. The hub will instead expose a governed **capability adapter** model. A provider can become available when it has a supported API, OAuth/deep-link surface, standards-based browser capability, or a separately installed companion extension with explicit user consent.

## Stack progression

- **PR1:** TypeScript 7 + React + Vite + PWA primitives.
- **PR2:** typed adapter contracts and KC policy receipts.
- **PR3:** .NET gateway proof for one provider.
- **PR4+:** PostgreSQL/MERN/PERN components only where product telemetry proves they are required.
- **Python:** analytics, inference, experimentation and data workflows where Python libraries materially improve the subsystem.
- **WebGL:** used for experiences that need accelerated graphics; not as a default requirement for every surface.

## Governance principle

The hub is not a universal iframe. It is a controlled execution membrane. Every integration must declare what it can read, what it can write, where data travels, what happens offline, and how the user revokes access.
