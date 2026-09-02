export const LEFA_MARKET_SCHEMA = 'kopano.lefa.market-observation.v1' as const;
export const LEFA_MARKET_FEED = 'iex' as const;

export type MarketObservationState = 'OBSERVED' | 'HOLD';

export interface LefaMarketObservation {
  schema: typeof LEFA_MARKET_SCHEMA;
  provider: 'alpaca';
  feed: typeof LEFA_MARKET_FEED;
  symbol: string;
  observation_state: MarketObservationState;
  observed_at: string;
  source_timestamp: string | null;
  latest_trade_price: number | null;
  bid_price: number | null;
  ask_price: number | null;
  minute_close: number | null;
  market_open: boolean | null;
  market_state: 'open' | 'closed' | 'unknown';
  provider_clock_timestamp: string | null;
  next_open: string | null;
  next_close: string | null;
  provenance: {
    source: 'alpaca_market_data';
    is_fixture: false;
  };
  code: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function normalizePrimarySymbol(value: string | undefined): string {
  const candidate = (value ?? 'SPY').trim().toUpperCase();
  return /^[A-Z][A-Z0-9.-]{0,14}$/.test(candidate) ? candidate : 'SPY';
}

export function marketHold(
  symbol: string,
  code: string,
  observedAt = new Date().toISOString(),
): LefaMarketObservation {
  return {
    schema: LEFA_MARKET_SCHEMA,
    provider: 'alpaca',
    feed: LEFA_MARKET_FEED,
    symbol,
    observation_state: 'HOLD',
    observed_at: observedAt,
    source_timestamp: null,
    latest_trade_price: null,
    bid_price: null,
    ask_price: null,
    minute_close: null,
    market_open: null,
    market_state: 'unknown',
    provider_clock_timestamp: null,
    next_open: null,
    next_close: null,
    provenance: {
      source: 'alpaca_market_data',
      is_fixture: false,
    },
    code,
  };
}

export function projectMarketObservation(
  snapshot: unknown,
  clock: unknown,
  symbol: string,
  observedAt = new Date().toISOString(),
): LefaMarketObservation {
  if (!isRecord(snapshot)) {
    return marketHold(symbol, 'MARKET_PROVIDER_INVALID_SNAPSHOT', observedAt);
  }

  const providerSymbol = stringValue(snapshot.symbol)?.toUpperCase();
  if (providerSymbol !== symbol) {
    return marketHold(symbol, 'MARKET_PROVIDER_SYMBOL_MISMATCH', observedAt);
  }

  const latestTrade = isRecord(snapshot.latestTrade) ? snapshot.latestTrade : null;
  const sourceTimestamp = latestTrade ? stringValue(latestTrade.t) : null;
  const latestTradePrice = latestTrade ? positiveNumber(latestTrade.p) : null;

  if (!sourceTimestamp || latestTradePrice === null) {
    return marketHold(symbol, 'MARKET_PROVIDER_TRADE_MISSING', observedAt);
  }

  if (!isRecord(clock) || typeof clock.is_open !== 'boolean') {
    return marketHold(symbol, 'MARKET_PROVIDER_CLOCK_INVALID', observedAt);
  }

  const clockTimestamp = stringValue(clock.timestamp);
  const nextOpen = stringValue(clock.next_open);
  const nextClose = stringValue(clock.next_close);

  if (!clockTimestamp || !nextOpen || !nextClose) {
    return marketHold(symbol, 'MARKET_PROVIDER_CLOCK_INVALID', observedAt);
  }

  const latestQuote = isRecord(snapshot.latestQuote) ? snapshot.latestQuote : null;
  const minuteBar = isRecord(snapshot.minuteBar) ? snapshot.minuteBar : null;

  const rawBid = latestQuote ? nonNegativeNumber(latestQuote.bp) : null;
  const rawAsk = latestQuote ? nonNegativeNumber(latestQuote.ap) : null;

  return {
    schema: LEFA_MARKET_SCHEMA,
    provider: 'alpaca',
    feed: LEFA_MARKET_FEED,
    symbol,
    observation_state: 'OBSERVED',
    observed_at: observedAt,
    source_timestamp: sourceTimestamp,
    latest_trade_price: latestTradePrice,
    // A zero quote side can occur outside regular liquidity. Treat it as absent,
    // not as a meaningful $0 market price.
    bid_price: rawBid && rawBid > 0 ? rawBid : null,
    ask_price: rawAsk && rawAsk > 0 ? rawAsk : null,
    minute_close: minuteBar ? positiveNumber(minuteBar.c) : null,
    market_open: clock.is_open,
    market_state: clock.is_open ? 'open' : 'closed',
    provider_clock_timestamp: clockTimestamp,
    next_open: nextOpen,
    next_close: nextClose,
    provenance: {
      source: 'alpaca_market_data',
      is_fixture: false,
    },
    code: 'MARKET_PROVIDER_OBSERVED',
  };
}
