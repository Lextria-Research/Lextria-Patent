import { useState, useEffect, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { exportF9F18CheckToExcel } from './exportExcel';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';

// Shared shape for the four "surface, don't auto-fix" review lists —
// each just needs its own column set. Hides itself when empty, so an
// all-clean sheet doesn't leave a stack of empty headers on screen.
function ReviewTable({ title, rows, columns }) {
  if (rows.length === 0) return null;
  return (
    <section className="f9f18-section">
      <h2 className="f9f18-section-title">{title} <span className="f9f18-count">({rows.length})</span></h2>
      <div className="table-wrap">
        <table className="records-table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.header}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => <td key={c.header}>{c.value(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Sheet entries the F9/F18 check can't safely fold into its Pending buckets
// — duplicated application numbers, a STATUS that contradicts F9/F18,
// an unparseable date, or a row with no Code at all. Same source data as
// F9/F18 pending (GET /api/f9-f18-check), fetched independently since this
// is its own Action list section, same as every other section here.
function F9F18DataIssues() {
  const isPhone = useIsPhone();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadReport = () => {
    setLoading(true);
    setError(null);
    return apiFetch(`${API_BASE}/api/f9-f18-check`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch F9/F18 check'));
        return res.json();
      })
      .then((d) => {
        setReport(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReport();
  }, []);

  const handleRefresh = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(await serverErrorMessage(res, 'Refresh failed'));
      await loadReport();
      showToast('success', 'Sheet refreshed');
    } catch (err) {
      showToast('error', `Refresh failed — ${isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message}`);
    }
  };

  if (!report && loading) return <div className="state"><p>Loading data issues…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const totalIssues = report.duplicateApplicationNumbers.length + report.statusContradictions.length
    + report.unclear.length + report.blankCode.length;

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    // Same workbook F9/F18 pending exports — it already carries all four
    // review sheets alongside the three buckets.
    exportF9F18CheckToExcel(report, `F9_F18_check_${today}.xlsx`)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">Data issues</h1>
        <p className="page-meta">
          {totalIssues} entr{totalIssues === 1 ? 'y' : 'ies'} the F9/F18 check couldn&apos;t safely place
        </p>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: totalIssues === 0 }}
        />
      ) : (
        <div className="toolbar">
          <button className="btn" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh sheet'}
          </button>
          <button className="btn" onClick={handleExport} disabled={totalIssues === 0}>
            Export to Excel
          </button>
        </div>
      )}

      <div className="summary-cards">
        <SummaryCard value={totalIssues} label="Total" />
        <SummaryCard value={report.duplicateApplicationNumbers.length} label="Duplicate app numbers" />
        <SummaryCard value={report.statusContradictions.length} label="STATUS contradictions" />
        <SummaryCard value={report.unclear.length} label="Unclear entries" />
        <SummaryCard value={report.blankCode.length} label="Blank Code rows" />
      </div>

      {totalIssues === 0 ? (
        <div className="state">
          <p className="state-title">Nothing to review</p>
          <p>Every row the F9/F18 check looked at fit its normal rules.</p>
        </div>
      ) : (
        <>
          <ReviewTable
            title="Duplicate application numbers"
            rows={report.duplicateApplicationNumbers}
            columns={[
              { header: 'Application no.', value: (d) => d.applicationNumber },
              { header: 'Codes', value: (d) => d.codes.join(', ') },
            ]}
          />
          <ReviewTable
            title="STATUS shows further progress while F9 or F18 still pending"
            rows={report.statusContradictions}
            columns={[
              { header: 'Code', value: (d) => d.code },
              { header: 'Application no.', value: (d) => d.applicationNumber },
              { header: 'STATUS', value: (d) => d.status },
              { header: 'F9 status', value: (d) => d.f9Status },
              { header: 'F18 status', value: (d) => d.f18Status },
            ]}
          />
          <ReviewTable
            title="Unclear entries (needs manual review)"
            rows={report.unclear}
            columns={[
              { header: 'Code', value: (d) => d.code },
              { header: 'Application no.', value: (d) => d.applicationNumber },
              { header: 'Field', value: (d) => d.field },
              { header: 'Raw value', value: (d) => d.raw },
            ]}
          />
          <ReviewTable
            title="Blank Code rows (data gap)"
            rows={report.blankCode}
            columns={[
              { header: 'Row (DATA sheet)', value: (d) => d.rowNumber },
              { header: 'Application no.', value: (d) => d.applicationNumber },
            ]}
          />
        </>
      )}
    </div>
  );
}

export default F9F18DataIssues;
