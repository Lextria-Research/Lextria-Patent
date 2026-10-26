import { useState, useEffect, useMemo, useRef } from 'react';
import Assignee from './Assignee';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { formatDateOrRaw, verdictClass } from './dueConstants';
import { exportDuesToExcel, exportF1F26DelayedToExcel, F1_F26_DELAYED_COLUMNS, F1_F26_SHEET_OPTIONS } from './exportExcel';
import { AppNoValue } from './CopyButton';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import MobileCard, { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';

const CAN = 'Can be fixed';
const CANNOT = 'Cannot';
const UNKNOWN = 'Unknown';

// Same set of sheet fields the list is built from — the code-click detail
// view, in the shape the other patent tabs pass to onSelectPatent.
function patentDetailRows(p) {
  return [
    ['Code', p.code],
    ['Application number', <AppNoValue value={p.applicationNumber} />],
    ['Assigned to', p.assignedTo],
    ['STATUS', p.status],
    ['PS date of filing', formatDateOrRaw(p.psFiled)],
    ['CS deadline', formatDateOrRaw(p.csDeadline)],
    ['CS date of filing', formatDateOrRaw(p.csFiled)],
    ['Form-1 deadline', formatDateOrRaw(p.form1Deadline)],
    ['Form-1 date of filing', formatDateOrRaw(p.form1Filed)],
    ['Form 26 deadline', formatDateOrRaw(p.form26Deadline)],
    ['Form-26 date of filing', formatDateOrRaw(p.form26Filed)],
    ['Remaining post-date months', p.postDateText],
  ];
}

// Form filter values → which of the row's form issues it looks at.
const FORM_KEYS = { '': ['form1', 'form26'], F1: ['form1'], F26: ['form26'] };

// True when a chosen form (either, for All) has an issue matching the chosen
// status (any, for All). So F1 + Delayed means Form 1 itself is Delayed.
function matchesFormFilters(p, formFilter, issueFilter) {
  return FORM_KEYS[formFilter].some((key) => p[key] && (!issueFilter || p[key].status === issueFilter));
}

// "Delayed 23d" / "Pending 5d", or a dash when that form has no issue.
function FormIssueCell({ form, label, className }) {
  return (
    <td className={className} data-label={label}>
      {form ? `${form.status} ${form.daysLate}d` : '—'}
    </td>
  );
}

// Phone card for one code: the same values the table shows, view only. A tap
// opens the same detail page the table's code link does.
function DelayedMobileCard({ p, onOpen }) {
  const issue = (form) => (form ? `${form.status} ${form.daysLate}d` : '');
  return (
    <MobileCard
      code={p.code}
      onOpen={onOpen}
      badge={<span className={verdictClass(p.verdict)}>{p.verdict}</span>}
      text={p.status ? <span className="f1f26-status">{p.status}</span> : ''}
      boxes={[
        { label: 'Form 1', value: issue(p.form1), tone: p.form1 ? 'warn' : undefined },
        { label: 'Form 26', value: issue(p.form26), tone: p.form26 ? 'warn' : undefined },
        { label: 'Days needed', value: p.daysNeeded },
        { label: 'Days available', value: p.daysAvailable === null ? UNKNOWN : p.daysAvailable },
      ]}
      footerLeft={<AppNoValue value={p.applicationNumber} />}
      footerRight={
        p.assignedTo && (
          <>
            <span className="mobile-card-footer-label">Assigned to</span>
            <Assignee name={p.assignedTo} />
          </>
        )
      }
    />
  );
}

// Read-only, sheet-derived list of applications where Form 1 or Form 26 is
// delayed or still pending, with a verdict on whether postdating can fix it.
// All the rules live in the backend (f1f26Delayed.js) — this only filters,
// searches and displays.
function F1F26Delayed({ onSelectPatent }) {
  const isPhone = useIsPhone();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadPatents = () => {
    setLoading(true);
    setError(null);
    return apiFetch(`${API_BASE}/api/f1-f26-delayed`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch F1/F26 delayed or pending'));
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPatents();
  }, []);

  const handleRefresh = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(await serverErrorMessage(res, 'Refresh failed'));
      await loadPatents();
      showToast('success', 'Sheet refreshed');
    } catch (err) {
      showToast('error', `Refresh failed — ${isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message}`);
    }
  };

  // The backend already sorts (fixable first, then days needed), and
  // filtering keeps that order.
  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.patents;
    if (verdictFilter) list = list.filter((p) => p.verdict === verdictFilter);
    if (formFilter || issueFilter) list = list.filter((p) => matchesFormFilters(p, formFilter, issueFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.code.toLowerCase().includes(q) || (p.applicationNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, verdictFilter, formFilter, issueFilter, search]);

  // Phones page the list (desktop shows everything).
  const pager = usePhonePage([verdictFilter, formFilter, issueFilter, search].join('|'), filtered.length);

  if (!data && loading) return <div className="state"><p>Loading F1/F26 delayed or pending…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const canCount = data.patents.filter((p) => p.verdict === CAN).length;
  const cannotCount = data.patents.filter((p) => p.verdict === CANNOT).length;
  const unknownCodes = data.patents.filter((p) => p.verdict === UNKNOWN).map((p) => p.code);
  const hasActiveFilter = Boolean(verdictFilter || formFilter || issueFilter || search.trim());

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `F1_F26_delayed_or_pending_${today}.xlsx`;
    // "All" splits into a Can be fixed sheet and a Cannot sheet; a single
    // verdict card exports just that one list on one sheet, as before.
    const exportFn = verdictFilter === '' ? exportF1F26DelayedToExcel : exportDuesToExcel;
    exportFn(filtered, F1_F26_DELAYED_COLUMNS, filename, F1_F26_SHEET_OPTIONS)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const searchInput = (
    <input
      id="f1f26-search"
      className="input"
      type="text"
      placeholder="Code or application number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const formSelect = (
    <select
      id="f1f26-form"
      className="select"
      value={formFilter}
      onChange={(e) => setFormFilter(e.target.value)}
    >
      <option value="">All</option>
      <option value="F1">F1</option>
      <option value="F26">F26</option>
    </select>
  );

  const issueSelect = (
    <select
      id="f1f26-issue"
      className="select"
      value={issueFilter}
      onChange={(e) => setIssueFilter(e.target.value)}
    >
      <option value="">All</option>
      <option value="Delayed">Delayed</option>
      <option value="Pending">Pending</option>
    </select>
  );

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">F1/F26 delayed or pending</h1>
        <p className="page-meta">
          {hasActiveFilter ? `${filtered.length} of ${data.count} shown` : `${data.count} codes`}
        </p>
      </div>

      {data.flagsUnavailable && (
        <div className="error" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
          Could not read the sheet&apos;s red Code cells, so abandoned codes may be included in this list.
          Try Refresh sheet; if it keeps happening, check the backend logs.
        </div>
      )}

      {unknownCodes.length > 0 && (
        <div className="error" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
          {unknownCodes.length} code{unknownCodes.length === 1 ? ' has' : 's have'} a Remaining Post-Date Months
          value that isn&apos;t recognised, so no verdict is given: {unknownCodes.join(', ')}.
        </div>
      )}

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, app no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'f1f26-form', label: 'Form', control: formSelect },
            { id: 'f1f26-issue', label: 'Delayed / Pending', control: issueSelect },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filtered.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="f1f26-search">Search</label>
            <div className="search-wrap">
              {searchInput}
              {search && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="f1f26-form">Form</label>
            {formSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="f1f26-issue">Delayed / Pending</label>
            {issueSelect}
          </div>

          <div className="filter-total" title="Codes matching the filters above">
            {filtered.length}
          </div>

          <button className="btn" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh sheet'}
          </button>

          <button className="btn" onClick={handleExport} disabled={filtered.length === 0}>
            Export to Excel
          </button>
        </div>
      )}

      <div className="summary-cards">
        <SummaryCard
          value={data.count}
          label="All"
          active={verdictFilter === ''}
          onClick={() => setVerdictFilter('')}
        />
        <SummaryCard
          value={canCount}
          label="Can be fixed"
          active={verdictFilter === CAN}
          onClick={() => setVerdictFilter(CAN)}
        />
        <SummaryCard
          value={cannotCount}
          label="Cannot"
          active={verdictFilter === CANNOT}
          onClick={() => setVerdictFilter(CANNOT)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="state">
          <p className="state-title">No codes to show</p>
          <p>
            {hasActiveFilter
              ? 'Clear the search or choose a different filter.'
              : 'No code has a delayed or pending Form 1 / Form 26 right now.'}
          </p>
        </div>
      ) : isPhone ? (
        <>
          <MobileCardList>
            {pager.slice(filtered).map((p) => (
              <DelayedMobileCard key={p.code} p={p} onOpen={() => onSelectPatent(p.code, patentDetailRows(p), p)} />
            ))}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : (
        <div className="table-wrap">
          <table className="f1f26-table">
            <thead>
              <tr>
                <th className="col-code">Code</th>
                <th className="col-appno">Application no.</th>
                <th className="col-owner">Assigned to</th>
                <th className="col-status">STATUS</th>
                <th className="col-form">Form 1</th>
                <th className="col-form">Form 26</th>
                <th className="col-days">Days needed</th>
                <th className="col-days">Days available</th>
                <th className="col-verdict">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.code}>
                  <td className="col-code">
                    <button className="link-btn" onClick={() => onSelectPatent(p.code, patentDetailRows(p))}>
                      {p.code}
                    </button>
                  </td>
                  <td className="col-appno" data-label="Application no."><AppNoValue value={p.applicationNumber} /></td>
                  <td className="col-owner" data-label="Assigned to"><Assignee name={p.assignedTo} /></td>
                  <td className="col-status" data-label="STATUS">{p.status || '—'}</td>
                  <FormIssueCell form={p.form1} label="Form 1" className="col-form" />
                  <FormIssueCell form={p.form26} label="Form 26" className="col-form" />
                  <td className="col-days" data-label="Days needed">{p.daysNeeded}</td>
                  <td className="col-days" data-label="Days available">
                    {p.daysAvailable === null ? UNKNOWN : p.daysAvailable}
                  </td>
                  <td className="col-verdict" data-label="Verdict">
                    <span className={verdictClass(p.verdict)}>{p.verdict}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default F1F26Delayed;
