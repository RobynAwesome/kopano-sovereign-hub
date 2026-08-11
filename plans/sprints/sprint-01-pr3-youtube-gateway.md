# Sprint 01 / PR3 — YouTube Rigid Gateway Proof

## Goal

Prove one real external provider can cross the Kopano-Phu membrane through a bounded server-side gateway without granting the APWA uncontrolled provider access.

## Provider

YouTube Data API v3 — public read only.

Configured channel: `@kopanolabs` by default.

## Proof path

```text
APWA / governed caller
  -> youtube.public-media.read
  -> KC adapter decision
  -> .NET 10 rigid gateway
  -> rate limit
  -> configured channel only
  -> YouTube channels.list
  -> uploads playlist
  -> YouTube playlistItems.list
  -> normalized response
  -> KC-compatible execution receipt
```

## Bounded capability

`youtube.channel.uploads.read`

Operation: `read` only.

PR3 explicitly does not implement publishing, commenting, liking, subscriptions, OAuth user data, arbitrary channel search or browser-extension execution.

## Credential boundary

- `YOUTUBE_API_KEY` exists only on the server-side runtime.
- no key is committed to the repository;
- no key is returned to the APWA;
- outbound HttpClient informational logging is suppressed for the YouTube client;
- no OAuth token is required because this proof reads public channel data only.

## Quota boundary

The gateway resolves the configured channel with `channels.list` and then reads its uploads playlist with `playlistItems.list`.

Both methods have a quota cost of 1 unit per call in the current YouTube Data API documentation. The gateway therefore adds:

- a maximum of 12 uploads per request;
- fixed-window inbound rate limiting;
- five-minute in-memory caching;
- no `search.list` use.

## API

### `GET /health`

Reports runtime and whether the API key is configured. It never returns the key.

### `GET /api/youtube/uploads?limit=6`

Returns normalized public upload metadata plus a KC-compatible gateway receipt.

`limit` is clamped to `1..12`.

## Acceptance gates

- [x] .NET 10 project exists.
- [x] server-side API key boundary exists.
- [x] one configured channel only.
- [x] read-only capability declaration exists.
- [x] rate limiting exists.
- [x] cache boundary exists.
- [x] normalized provider response exists.
- [x] KC receipt shape exists.
- [x] APWA adapter catalogue declares the gateway.
- [x] KC allows bounded external read through declared gateway while keeping unproven external reads under REVIEW.
- [ ] TypeScript + .NET CI passes.
- [ ] live upstream proof with a real restricted `YOUTUBE_API_KEY`.
- [ ] gateway deployment receipt.

## Non-claims

PR3 does not claim production readiness until a restricted real API key is installed and the live upstream path produces a receipt.
