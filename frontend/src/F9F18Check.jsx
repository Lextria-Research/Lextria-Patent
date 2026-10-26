import { useState, useEffect, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { formatDate, formatDateOrRaw, rfeDeadlineText } from './dueConstants';
import { exportF9F18CheckToExcel } from './exportExcel';
import { AppNoValue } from './CopyButton';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import Assignee from './Assignee';
import MobileCard, { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';

// Full field set for a pending row's code-click detail view — Applicant
// Name and Inventor Name live here instead of as table columns, same
// pattern as Granted/Published/Patent filed's patentDetailRows.
function patentDetailRows(r) {
  return [
    ['Code', r.code],
    ['Application number', <AppNoValue value={r.applicationNumber} />],
    ['Title', r.title],
    ['Applicant name', r.applicantName],
    ['Inventor name', r.inventorName],
    ['Assigned to', r.assignedTo],
    ['CS filing date', formatDateOrRaw(r.csFilingDate)],
    ['Publication date', formatDateOrRaw(r.publicationDate)],
    ['F9 status', r.f9Status],
    ['F18 status', r.f18Status],
    ['RFE deadline (Form-18)', r.rfeDeadline ? formatDate(r.rfeDeadline) : 'Unknown (no parseable PS/CS date)'],
  ];
}

// One bucket's table — Both/F9-only/F18-only all share the same columns.
// A lapsed RFE deadline shades the whole row, same convention as overdue
// renewals on Granted patents. Applicant/Inventor name are dropped from
// the table itself and only shown via the code-click detail view.
function BucketTable({ title, rows, onSelectPatent }) {
  if (rows.length === 0) return null;
  return (
    <section className="f9f18-section">
      <h2 className="f9f18-section-title">{title} <span className="f9f18-count">({rows.length})</span></h2>
      <div className="table-wrap">
        <table className="f9f18-table">
          <thead>
            <tr>
              <th className="col-code">Code</th>
              <th className="col-appno">Application no.</th>
              <th className="col-title">Title</th>
              <th className="col-owner">Assigned to</th>
              <th className="col-cs">CS filing date</th>
              <th className="col-pubdate">Publication date</th>
              <th className="col-f9">F9 status</th>
              <th className="col-f18">F18 status</th>
              <th className="col-rfe">RFE deadline (Form-18)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.code}-${i}`} className={r.deadlineLapsed ? 'is-overdue' : ''}>
                <td className="col-code">
                  <button className="link-btn" onClick={() => onSelectPatent(r.code, patentDetailRows(r))}>
                    {r.code}
                  </button>
                </td>
                <td className="col-appno" data-label="Application no."><AppNoValue value={r.applicationNumber} /></td>
                <td className="cell-title col-title" data-label="Title">{r.title}</td>
                <td className="col-owner" data-label="Assigned to">{r.assignedTo}</td>
                <td className="col-cs" data-label="CS filing date">{formatDateOrRaw(r.csFilingDate)}</td>
                <td className="col-pubdate" data-label="Publication date">{formatDateOrRaw(r.publicationDate)}</td>
                <td className="col-f9" data-label="F9 status">{r.f9Status}</td>
                <td className="col-f18" data-label="F18 status">{r.f18Status}</td>
                <td className="col-rfe" data-label="RFE deadline (Form-18)">
                  {r.rfeDeadline ? formatDate(r.rfeDeadline) : 'Unknown (no parseable PS/CS date)'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Phone card for one pending row. View only; a tap opens the same detail
// page the table's code link does. A lapsed RFE deadline gets the same red
// tint as the table's shaded row.
function PendingMobileCard({ row: r, onOpen }) {
  const rfeText = rfeDeadlineText(r);
  return (
    <MobileCard
      code={r.code}
      onOpen={onOpen}
      tone={r.deadlineLapsed ? 'bad' : undefined}
      title={r.title}
      pills={[
        r.f9Status === 'Pending' && <span key="f9" className="status-pill">F9 pending</span>,
        r.f18Status === 'Pending' && <span key="f18" className="status-pill">F18 pending</span>,
      ]}
      note={
        <span className={`rfe-row ${r.deadlineLapsed ? 'is-lapsed' : ''}`}>
          <span className="rfe-row-label">{r.deadlineLapsed ? 'RFE lapsed' : 'RFE deadline'}</span>
          <span className="rfe-row-date">{rfeText}</span>
        </span>
      }
      footerLeft={<AppNoValue value={r.applicationNumber} />}
      footerRight={
        r.assignedTo && (
          <>
            <span className="mobile-card-footer-label">Assigned to</span>
            <Assignee name={r.assignedTo} />
          </>
        )
      }
    />
  );
}

function F9F18Check({ onSelectPatent }) {
  const isPhone = useIsPhone();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  // null = all three buckets shown; 'both'/'f9'/'f18' filters to just one.
  const [bucketFilter, setBucketFilter] = useState(null);

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

  // Phones: one flat, paged list in the desktop's bucket order (both, F9 only,
  // F18 only) — each card's pills say which forms are pending.
  const phoneRows = !report ? [] : [
    ...(bucketFilter === null || bucketFilter === 'both' ? report.bothPending : []),
    ...(bucketFilter === null || bucketFilter === 'f9' ? report.f9PendingOnly : []),
    ...(bucketFilter === null || bucketFilter === 'f18' ? report.f18PendingOnly : []),
  ];
  const pager = usePhonePage(String(bucketFilter), phoneRows.length);

  if (!report && loading) return <div className="state"><p>Loading F9/F18 check…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const totalPending = report.bothPending.length + report.f9PendingOnly.length + report.f18PendingOnly.length;

  const bucketMeta = {
    both: { title: 'Both F9 & F18 pending', rows: report.bothPending },
    f9: { title: 'F9 pending only', rows: report.f9PendingOnly },
    f18: { title: 'F18 pending only', rows: report.f18PendingOnly },
  };

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    exportF9F18CheckToExcel(report, `F9_F18_check_${today}.xlsx`)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">F9/F18 pending</h1>
        <p className="page-meta">{totalPending} application{totalPending === 1 ? '' : 's'} with a pending Form-9 or Form-18</p>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: totalPending === 0 }}
        />
      ) : (
        <div className="toolbar">
          <button className="btn" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh sheet'}
          </button>
          <button className="btn" onClick={handleExport} disabled={totalPending === 0}>
            Export to Excel
          </button>
        </div>
      )}

      <div className="summary-cards">
        <SummaryCard
          value={totalPending}
          label="Total"
          active={bucketFilter === null}
          onClick={() => setBucketFilter(null)}
        />
        <SummaryCard
          value={report.bothPending.length}
          label="Both F9 & F18 pending"
          active={bucketFilter === 'both'}
          onClick={() => setBucketFilter('both')}
        />
        <SummaryCard
          value={report.f9PendingOnly.length}
          label="F9 pending only"
          active={bucketFilter === 'f9'}
          onClick={() => setBucketFilter('f9')}
        />
        <SummaryCard
          value={report.f18PendingOnly.length}
          label="F18 pending only"
          active={bucketFilter === 'f18'}
          onClick={() => setBucketFilter('f18')}
        />
      </div>

      {isPhone && phoneRows.length > 0 ? (
        <>
          <MobileCardList>
            {pager.slice(phoneRows).map((r) => (
              <PendingMobileCard
                key={`${r.code}-${phoneRows.indexOf(r)}`}
                row={r}
                onOpen={() => onSelectPatent(r.code, patentDetailRows(r), r)}
              />
            ))}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : bucketFilter === null ? (
        totalPending === 0 ? (
          <div className="state">
            <p className="state-title">Nothing pending</p>
            <p>Every CS-filed application has both Form-9 (where relevant) and Form-18 filed.</p>
          </div>
        ) : (
          <>
            <BucketTable {...bucketMeta.both} onSelectPatent={onSelectPatent} />
            <BucketTable {...bucketMeta.f9} onSelectPatent={onSelectPatent} />
            <BucketTable {...bucketMeta.f18} onSelectPatent={onSelectPatent} />
          </>
        )
      ) : bucketMeta[bucketFilter].rows.length === 0 ? (
        <div className="state">
          <p className="state-title">Nothing here</p>
          <p>No applications in this bucket right now.</p>
        </div>
      ) : (
        <BucketTable {...bucketMeta[bucketFilter]} onSelectPatent={onSelectPatent} />
      )}
    </div>
  );
}

export default F9F18Check;
