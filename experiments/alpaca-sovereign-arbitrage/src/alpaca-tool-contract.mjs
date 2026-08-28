/**
 * Canonical Alpaca MCP V2 tool boundary for the hackathon lane.
 * Source of tool names: Alpaca Trading MCP Server documentation (2026-08-28 check).
 */
export const OBSERVATION_TOOLS = Object.freeze([
  'get_account_info',
  'get_account_config',
  'get_all_positions',
  'get_orders',
  'get_clock',
  'get_stock_bars',
  'get_stock_latest_quote',
  'get_option_contracts',
  'get_option_contract',
  'get_option_chain',
  'get_option_snapshot',
  'get_option_latest_quote'
]);

export const EXECUTION_TOOLS = Object.freeze([
  'place_option_order',
  'replace_order_by_id',
  'cancel_order_by_id',
  'close_position'
]);

export const REQUIRED_TOOLSETS = Object.freeze([
  'account',
  'trading',
  'assets',
  'stock-data',
  'options-data'
]);

const allowed = new Set([...OBSERVATION_TOOLS, ...EXECUTION_TOOLS]);

export function assertToolAllowed(toolName, { execute = false } = {}) {
  if (!allowed.has(toolName)) {
    throw new Error(`Tool ${toolName} is outside the bounded Alpaca hackathon contract.`);
  }
  if (!execute && EXECUTION_TOOLS.includes(toolName)) {
    throw new Error(`Execution tool ${toolName} requires execute=true.`);
  }
  return true;
}

export function paperRuntimeEnvironment() {
  return {
    ALPACA_PAPER_TRADE: 'true',
    ALPACA_TOOLSETS: REQUIRED_TOOLSETS.join(',')
  };
}
