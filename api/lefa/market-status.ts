import {
  LEFA_MARKET_FEED,
  marketHold,
  normalizePrimarySymbol,
  projectMarketObservation,
} from '../../src/lefa-market-observation';

const ALPACA_MARKET_BASE = 'https://data.alpaca.markets/v2/stocks';
const ALPACA_PAPER_CLOCK_ENDPOINT = 'https://paper-api.alpaca.markets/v2/clock';

const baseHeaders: Record<string, string> = {
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store',
  vary: 'origin',
};

type RuntimeGlobal = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

function env(name: string): string {
  const runtime = globalThis as RuntimeGlobal;
  return runtime.process?.env?.[name]?.trim() ?? '';
}

function corsFor(request: Request) {
  const origin = request.headers.get('origin');
  const configuredOrigin = env('LEFA_ALLOWED_ORIGIN');
  const headers = { ...baseHeaders };

  if (!origin) return { allowed: true, headers };
  if (!configuredOrigin || origin !== configuredOrigin) return { allowed: false, headers };

  headers['access-control-allow-origin'] = origin;
  return { allowed: true, headers };
}

function authHeaders(apiKey: string, secretKey: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': secretKey,
  };
}

export default {
  async fetch(request: Request) {
    const cors = corsFor(request);
    const symbol = normalizePrimarySymbol(env('LEFA_PRIMARY_SYMBOL'));

    if (!cors.allowed) {
      return Response.json(marketHold(symbol, 'ORIGIN_NOT_ALLOWED'), {
        status: 403,
        headers: cors.headers,
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors.headers });
    }

    if (request.method !== 'GET') {
      return Response.json(marketHold(symbol, 'METHOD_NOT_ALLOWED'), {
        status: 405,
        headers: cors.headers,
      });
    }

    const apiKey = env('ALPACA_API_KEY');
    const secretKey = env('ALPACA_SECRET_KEY');

    if (!apiKey || !secretKey) {
      return Response.json(marketHold(symbol, 'PAPER_CREDENTIALS_UNAVAILABLE'), {
        status: 503,
        headers: cors.headers,
      });
    }

    const snapshotEndpoint = `${ALPACA_MARKET_BASE}/${encodeURIComponent(symbol)}/snapshot?feed=${LEFA_MARKET_FEED}`;
    const headers = authHeaders(apiKey, secretKey);

    let snapshotResponse: Response;
    let clockResponse: Response;
    try {
      [snapshotResponse, clockResponse] = await Promise.all([
        fetch(snapshotEndpoint, { method: 'GET', headers, cache: 'no-store' }),
        fetch(ALPACA_PAPER_CLOCK_ENDPOINT, { method: 'GET', headers, cache: 'no-store' }),
      ]);
    } catch {
      return Response.json(marketHold(symbol, 'MARKET_PROVIDER_UNREACHABLE'), {
        status: 503,
        headers: cors.headers,
      });
    }

    if (!snapshotResponse.ok) {
      return Response.json(
        marketHold(symbol, `MARKET_PROVIDER_HTTP_${snapshotResponse.status}`),
        { status: 503, headers: cors.headers },
      );
    }

    if (!clockResponse.ok) {
      return Response.json(marketHold(symbol, `MARKET_CLOCK_HTTP_${clockResponse.status}`), {
        status: 503,
        headers: cors.headers,
      });
    }

    let snapshot: unknown;
    let clock: unknown;
    try {
      [snapshot, clock] = await Promise.all([snapshotResponse.json(), clockResponse.json()]);
    } catch {
      return Response.json(marketHold(symbol, 'MARKET_PROVIDER_INVALID_JSON'), {
        status: 503,
        headers: cors.headers,
      });
    }

    const observation = projectMarketObservation(snapshot, clock, symbol);
    return Response.json(observation, {
      status: observation.observation_state === 'OBSERVED' ? 200 : 503,
      headers: cors.headers,
    });
  },
};
