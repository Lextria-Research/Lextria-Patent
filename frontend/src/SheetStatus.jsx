import { useState, useEffect } from 'react';
import { API_BASE } from './api';

const POLL_MS = 60 * 1000;

function formatTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// The phone header shows the time as "hh:mm AM/PM" whatever the device locale.
function formatTime12(iso) {
  if (!iso) return null;
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
}

// Surfaces sheetCache's own status so a failed/stale Google Sheets refresh
// is visible instead of silently looking like a legitimately empty result
// (what happened during the "0 dues" incident).
function SheetStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      fetch(`${API_BASE}/api/health`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data?.sheetStatus) return;
          const { fetchedAt, lastError, refreshIntervalMs } = data.sheetStatus;
          const staleAfterMs = (refreshIntervalMs || 5 * 60 * 1000) * 2;
          const isStale = !fetchedAt || Boolean(lastError) || Date.now() - new Date(fetchedAt).getTime() > staleAfterMs;
          setStatus({ fetchedAt, lastError, isStale, unreachable: false });
        })
        .catch(() => {
          if (!cancelled) setStatus((prev) => (prev ? { ...prev, unreachable: true } : { unreachable: true }));
        });
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!status) return null;

  const { fetchedAt, lastError, isStale, unreachable } = status;

  if (unreachable) {
    return (
      <span className="sheet-status sheet-status-bad" title="Could not reach the backend to check sheet sync status">
        ⚠ Backend unreachable
      </span>
    );
  }

  if (isStale) {
    const reason = lastError
      ? `Last error: ${lastError}`
      : fetchedAt
        ? `Last successful sync: ${formatTime(fetchedAt)}`
        : 'No successful sync yet';
    return (
      <span className="sheet-status sheet-status-bad" title={reason}>
        ⚠ Data may be stale
      </span>
    );
  }

  return (
    <span className="sheet-status" title="LR Sheet is syncing normally">
      <span className="sheet-status-full">Synced {formatTime(fetchedAt)}</span>
      <span className="sheet-status-phone">Synced {formatTime12(fetchedAt)}</span>
    </span>
  );
}

export default SheetStatus;
