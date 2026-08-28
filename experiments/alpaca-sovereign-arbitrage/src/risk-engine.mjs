const VALID_DECISIONS = new Set(['APPROVE', 'HOLD', 'REJECT']);
const VALID_POSITION_INTENTS = new Set([
  'buy_to_open',
  'buy_to_close',
  'sell_to_open',
  'sell_to_close'
]);

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

function pushReason(reasons, severity, code, message) {
  reasons.push({ severity, code, message });
}

function highestSeverity(reasons) {
  if (reasons.some((r) => r.severity === 'REJECT')) return 'REJECT';
  if (reasons.some((r) => r.severity === 'HOLD')) return 'HOLD';
  return 'APPROVE';
}

function protectiveStructure(candidate) {
  const legs = Array.isArray(candidate?.legs) ? candidate.legs : [];
  const opening = legs.filter((leg) => String(leg.position_intent || '').endsWith('_to_open'));
  const shorts = opening.filter((leg) => leg.position_intent === 'sell_to_open');
  const longs = opening.filter((leg) => leg.position_intent === 'buy_to_open');
  return {
    openingLegs: opening.length,
    shortLegs: shorts.length,
    longLegs: longs.length,
    hasProtection: shorts.length > 0 && longs.length > 0 && longs.length >= shorts.length
  };
}

export function evaluateTradeIntent({ account, portfolio, market, candidate, policy }) {
  const reasons = [];
  const startEquity = finiteNumber(account?.competition_start_equity);
  const equity = finiteNumber(account?.equity);
  const candidateMaxLoss = finiteNumber(candidate?.max_loss_usd);
  const deployedRisk = finiteNumber(portfolio?.defined_risk_usd) ?? 0;
  const dte = finiteNumber(candidate?.dte);
  const iv = finiteNumber(market?.atm_iv);
  const realizedVol = finiteNumber(market?.realized_vol_20d);
  const ivRv = ratio(iv, realizedVol);
  const ivPercentile = finiteNumber(market?.iv_percentile);
  const ivObservations = finiteNumber(market?.iv_history_observations) ?? 0;
  const relativeSpread = finiteNumber(market?.relative_bid_ask_spread);
  const minShortOpenInterest = finiteNumber(market?.min_short_leg_open_interest);
  const legs = Array.isArray(candidate?.legs) ? candidate.legs : [];

  if (account?.paper !== true) {
    pushReason(reasons, 'REJECT', 'PAPER_ONLY', 'Competition lane is paper-only.');
  }

  if (startEquity !== policy.competition.required_starting_equity_usd) {
    pushReason(
      reasons,
      'REJECT',
      'START_EQUITY_MISMATCH',
      `Competition start equity must equal $${policy.competition.required_starting_equity_usd}.`
    );
  }

  if (equity === null || equity <= 0) {
    pushReason(reasons, 'HOLD', 'ACCOUNT_EQUITY_UNKNOWN', 'Current account equity is unavailable or invalid.');
  }

  const drawdown = equity !== null && startEquity !== null ? Math.max(0, (startEquity - equity) / startEquity) : null;
  if (drawdown !== null && drawdown >= policy.risk.max_drawdown_fraction) {
    pushReason(reasons, 'REJECT', 'DRAWDOWN_KILL_SWITCH', 'Maximum competition drawdown gate has been reached.');
  }

  if (!policy.universe.includes(candidate?.underlying)) {
    pushReason(reasons, 'REJECT', 'UNIVERSE', 'Underlying is outside the approved liquid universe.');
  }

  if (!policy.structures.includes(candidate?.structure)) {
    pushReason(reasons, 'REJECT', 'STRUCTURE', 'Only bounded credit spreads and iron condors are permitted.');
  }

  if (legs.length < 2 || legs.length > policy.risk.max_legs) {
    pushReason(reasons, 'REJECT', 'LEG_COUNT', `Option structures require 2-${policy.risk.max_legs} legs.`);
  }

  for (const [index, leg] of legs.entries()) {
    if (!VALID_POSITION_INTENTS.has(leg?.position_intent)) {
      pushReason(reasons, 'REJECT', 'POSITION_INTENT', `Leg ${index + 1} has an invalid position_intent.`);
    }
    if (!leg?.symbol || typeof leg.symbol !== 'string') {
      pushReason(reasons, 'REJECT', 'LEG_SYMBOL', `Leg ${index + 1} is missing an option symbol.`);
    }
  }

  const structure = protectiveStructure(candidate);
  if (policy.risk.defined_risk_only && !structure.hasProtection) {
    pushReason(reasons, 'REJECT', 'NAKED_SHORT', 'Every opening short option leg must be paired with protective long risk.');
  }

  if (candidateMaxLoss === null || candidateMaxLoss <= 0) {
    pushReason(reasons, 'HOLD', 'MAX_LOSS_UNKNOWN', 'Maximum loss must be deterministic before execution.');
  } else if (equity !== null && candidateMaxLoss > equity * policy.risk.max_trade_risk_fraction) {
    pushReason(reasons, 'REJECT', 'TRADE_RISK_CAP', 'Candidate maximum loss exceeds the per-structure risk cap.');
  }

  if (candidateMaxLoss !== null && equity !== null) {
    const postTradeRisk = deployedRisk + candidateMaxLoss;
    if (postTradeRisk > equity * policy.risk.max_portfolio_defined_risk_fraction) {
      pushReason(reasons, 'REJECT', 'PORTFOLIO_RISK_CAP', 'Post-trade defined risk exceeds the portfolio cap.');
    }
  }

  if (dte === null) {
    pushReason(reasons, 'HOLD', 'DTE_UNKNOWN', 'DTE is required.');
  } else if (dte < policy.entry.dte_min || dte > policy.entry.dte_max) {
    pushReason(reasons, 'REJECT', 'DTE_RANGE', 'Candidate is outside the governed entry DTE window.');
  }

  const shortDelta = Math.abs(finiteNumber(candidate?.short_delta) ?? NaN);
  if (!Number.isFinite(shortDelta)) {
    pushReason(reasons, 'HOLD', 'SHORT_DELTA_UNKNOWN', 'Short-leg delta is required.');
  } else if (shortDelta < policy.entry.short_delta_abs_min || shortDelta > policy.entry.short_delta_abs_max) {
    pushReason(reasons, 'REJECT', 'SHORT_DELTA', 'Short-leg delta is outside the governed target band.');
  }

  if (ivRv === null) {
    pushReason(reasons, 'HOLD', 'VOLATILITY_DATA', 'Current IV and 20-day realized volatility are required.');
  } else if (ivRv < policy.entry.iv_to_realized_vol_min) {
    pushReason(reasons, 'REJECT', 'VOLATILITY_PREMIUM', 'Implied volatility is not sufficiently elevated versus realized volatility.');
  }

  if (ivObservations >= policy.entry.iv_percentile_min_observations) {
    if (ivPercentile === null) {
      pushReason(reasons, 'HOLD', 'IV_PERCENTILE_UNKNOWN', 'Historical IV percentile is expected when sufficient history exists.');
    } else if (ivPercentile < policy.entry.iv_percentile_min) {
      pushReason(reasons, 'REJECT', 'IV_PERCENTILE', 'Historical IV percentile is below the premium-harvest threshold.');
    }
  }

  if (relativeSpread === null) {
    pushReason(reasons, 'HOLD', 'LIQUIDITY_SPREAD_UNKNOWN', 'Relative option bid/ask spread is required.');
  } else if (relativeSpread > policy.entry.max_relative_bid_ask_spread) {
    pushReason(reasons, 'REJECT', 'LIQUIDITY_SPREAD', 'Bid/ask spread is too wide.');
  }

  if (minShortOpenInterest === null) {
    pushReason(reasons, 'HOLD', 'OPEN_INTEREST_UNKNOWN', 'Short-leg open interest is required.');
  } else if (minShortOpenInterest < policy.entry.min_open_interest_per_short_leg) {
    pushReason(reasons, 'REJECT', 'OPEN_INTEREST', 'Short-leg open interest is below the minimum liquidity gate.');
  }

  const decision = highestSeverity(reasons);
  if (!VALID_DECISIONS.has(decision)) throw new Error(`Unexpected decision: ${decision}`);

  return {
    decision,
    reasons,
    metrics: {
      start_equity: startEquity,
      equity,
      drawdown_fraction: drawdown,
      candidate_max_loss_usd: candidateMaxLoss,
      defined_risk_before_usd: deployedRisk,
      defined_risk_after_usd: candidateMaxLoss === null ? null : deployedRisk + candidateMaxLoss,
      iv_to_realized_vol: ivRv,
      dte,
      leg_count: legs.length
    }
  };
}

export function shouldClosePosition({ dte, maxCredit, currentProfit, policy }) {
  const closeReasons = [];
  const numericDte = finiteNumber(dte);
  const credit = finiteNumber(maxCredit);
  const profit = finiteNumber(currentProfit);

  if (numericDte !== null && numericDte <= policy.exit.mandatory_close_dte) {
    closeReasons.push('DTE_FLOOR');
  }
  if (credit !== null && credit > 0 && profit !== null && profit >= credit * policy.exit.profit_take_fraction_of_max_credit) {
    closeReasons.push('PROFIT_TARGET');
  }

  return { close: closeReasons.length > 0, reasons: closeReasons };
}
