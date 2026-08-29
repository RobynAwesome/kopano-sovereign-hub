import { evaluateMultiLegCapability } from './mcp-adapter.mjs';

function reason(severity, code, message) {
  return { severity, code, message };
}

export function evaluateCompetitionReadiness({ runtime, account, market, capabilityProbe }) {
  const reasons = [];

  if (runtime?.paper_trade !== true) {
    reasons.push(reason('REJECT', 'PAPER_ONLY', 'Competition execution must target Alpaca paper trading.'));
  }
  if (runtime?.credentials_present !== true) {
    reasons.push(reason('HOLD', 'CREDENTIALS_MISSING', 'Alpaca credentials are not connected to the execution runtime.'));
  }

  if (!account) {
    reasons.push(reason('HOLD', 'ACCOUNT_SNAPSHOT_MISSING', 'A fresh Alpaca account snapshot is required.'));
  } else {
    if (account.start_equity_receipt_verified !== true) {
      reasons.push(reason('HOLD', 'START_EQUITY_RECEIPT_MISSING', 'Competition starting equity requires an immutable first-connect receipt.'));
    }
    if (Number(account.competition_start_equity) !== 100000) {
      reasons.push(reason('REJECT', 'START_EQUITY_MISMATCH', 'Competition starting equity must be exactly $100,000.'));
    }
    if (Number(account.options_trading_level) < 3) {
      reasons.push(reason('HOLD', 'OPTIONS_LEVEL_3_REQUIRED', 'Credit spreads and iron condors require Alpaca Level 3 options capability.'));
    }
    if (account.trading_blocked === true || account.account_blocked === true) {
      reasons.push(reason('HOLD', 'ACCOUNT_BLOCKED', 'Alpaca reports the account or trading lane as blocked.'));
    }
  }

  if (market?.options_data_available !== true) {
    reasons.push(reason('HOLD', 'OPTIONS_DATA_UNAVAILABLE', 'Options chain, quote, IV and Greeks data must be available before proposal generation.'));
  }

  const mleg = evaluateMultiLegCapability(capabilityProbe);
  if (mleg.decision !== 'APPROVE') {
    reasons.push(reason('HOLD', mleg.code, mleg.message));
  }

  const decision = reasons.some((item) => item.severity === 'REJECT')
    ? 'REJECT'
    : reasons.length
      ? 'HOLD'
      : 'READY';

  return {
    decision,
    reasons,
    gates: {
      paper: runtime?.paper_trade === true,
      credentials: runtime?.credentials_present === true,
      start_equity_receipt: account?.start_equity_receipt_verified === true,
      start_equity_exact: Number(account?.competition_start_equity) === 100000,
      options_level_3: Number(account?.options_trading_level) >= 3,
      account_unblocked: account ? account.trading_blocked !== true && account.account_blocked !== true : false,
      options_data: market?.options_data_available === true,
      mcp_multi_leg: mleg.decision === 'APPROVE'
    }
  };
}
