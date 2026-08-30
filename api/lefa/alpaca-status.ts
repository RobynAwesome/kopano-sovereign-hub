const ALPACA_PAPER_ACCOUNT_ENDPOINT = 'https://paper-api.alpaca.markets/v2/account';

const baseHeaders: Record<string, string> = {
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'cache-control': 'no-store',
  vary: 'origin',
};

type BridgeState = 'VERIFIED' | 'HOLD';

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

  // Server-to-server and same-runtime calls do not require a browser Origin header.
  if (!origin) return { allowed: true, headers };

  if (!configuredOrigin || origin !== configuredOrigin) {
    return { allowed: false, headers };
  }

  headers['access-control-allow-origin'] = origin;
  return { allowed: true, headers };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function statusBody({
  bridgeState,
  code,
  accountStatus = 'UNKNOWN',
  accountBlocked = null,
  tradingBlocked = null,
  tradeSuspendedByUser = null,
}: {
  bridgeState: BridgeState;
  code: string;
  accountStatus?: string;
  accountBlocked?: boolean | null;
  tradingBlocked?: boolean | null;
  tradeSuspendedByUser?: boolean | null;
}) {
  return {
    schema: 'kopano.lefa.sovereign-bridge-status.v1',
    provider: 'alpaca',
    environment: 'paper',
    bridge_state: bridgeState,
    execution_authority: 'BACKEND_ONLY',
    observed_at: new Date().toISOString(),
    latest_receipt: null,
    provider_observation: {
      code,
      account_status: accountStatus,
      account_blocked: accountBlocked,
      trading_blocked: tradingBlocked,
      trade_suspended_by_user: tradeSuspendedByUser,
    },
    truth_boundary:
      'This endpoint proves only a request-time observation of the configured Alpaca paper account. It does not prove starting equity, Level 3 options entitlement, portfolio risk, strategy approval, multi-leg execution readiness, or a provider order receipt.',
  };
}

export default {
  async fetch(request: Request) {
    const cors = corsFor(request);

    if (!cors.allowed) {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: 'ORIGIN_NOT_ALLOWED' }),
        { status: 403, headers: cors.headers },
      );
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors.headers });
    }

    if (request.method !== 'GET') {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: 'METHOD_NOT_ALLOWED' }),
        { status: 405, headers: cors.headers },
      );
    }

    const apiKey = env('ALPACA_API_KEY');
    const secretKey = env('ALPACA_SECRET_KEY');

    if (!apiKey || !secretKey) {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: 'PAPER_CREDENTIALS_UNAVAILABLE' }),
        { status: 503, headers: cors.headers },
      );
    }

    let response: Response;
    try {
      response = await fetch(ALPACA_PAPER_ACCOUNT_ENDPOINT, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': secretKey,
        },
        cache: 'no-store',
      });
    } catch {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: 'PAPER_PROVIDER_UNREACHABLE' }),
        { status: 503, headers: cors.headers },
      );
    }

    if (!response.ok) {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: `PAPER_PROVIDER_HTTP_${response.status}` }),
        { status: 503, headers: cors.headers },
      );
    }

    let account: unknown;
    try {
      account = await response.json();
    } catch {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: 'PAPER_PROVIDER_INVALID_JSON' }),
        { status: 503, headers: cors.headers },
      );
    }

    if (!isRecord(account)) {
      return Response.json(
        statusBody({ bridgeState: 'HOLD', code: 'PAPER_PROVIDER_INVALID_ACCOUNT' }),
        { status: 503, headers: cors.headers },
      );
    }

    const accountStatus = typeof account.status === 'string' ? account.status : 'UNKNOWN';
    const accountBlocked = typeof account.account_blocked === 'boolean' ? account.account_blocked : null;
    const tradingBlocked = typeof account.trading_blocked === 'boolean' ? account.trading_blocked : null;
    const tradeSuspendedByUser =
      typeof account.trade_suspended_by_user === 'boolean' ? account.trade_suspended_by_user : null;

    if (
      accountStatus !== 'ACTIVE' ||
      accountBlocked !== false ||
      tradingBlocked !== false ||
      tradeSuspendedByUser !== false
    ) {
      return Response.json(
        statusBody({
          bridgeState: 'HOLD',
          code: 'PAPER_ACCOUNT_NOT_EXECUTION_READY',
          accountStatus,
          accountBlocked,
          tradingBlocked,
          tradeSuspendedByUser,
        }),
        { status: 200, headers: cors.headers },
      );
    }

    return Response.json(
      statusBody({
        bridgeState: 'VERIFIED',
        code: 'PAPER_ACCOUNT_OBSERVED',
        accountStatus,
        accountBlocked,
        tradingBlocked,
        tradeSuspendedByUser,
      }),
      { status: 200, headers: cors.headers },
    );
  },
};
