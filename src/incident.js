const TABLE = {
  lp_pull: { severity: 'crit', haltCopy: true, closePosition: true },
  authority_change: { severity: 'crit', haltCopy: true, closePosition: false },
  slip_spike: { severity: 'warn', haltCopy: false, closePosition: false, reduce: true },
  rpc_timeout: { severity: 'warn', haltCopy: true, closePosition: false },
  tx_fail: { severity: 'warn', haltCopy: false, closePosition: false },
  curve_stall: { severity: 'info', haltCopy: false, closePosition: false },
};

export function classifyIncident(ev = {}) {
  const type = ev.type || 'tx_fail';
  const row = TABLE[type] || TABLE.tx_fail;
  return {
    type,
    token: ev.token || '',
    detail: ev.detail || type,
    severity: row.severity,
    haltCopy: row.haltCopy,
    closePosition: !!row.closePosition,
    reduce: !!row.reduce,
  };
}
