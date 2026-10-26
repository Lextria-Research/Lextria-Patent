import { useState, useEffect, useMemo, useRef } from 'react';
import Assignee from './Assignee';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { formatDate, codePrefix, isBlankValue } from './dueConstants';
import { exportAbandonedPatentsToExcel, ABANDONED_PATENTS_COLUMNS } from './exportExcel';
import { AppNoValue } from './CopyButton';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import MobileCard, { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';

// Same field set as ABANDONED_PATENTS_COLUMNS (export), plus Date of grant
// — no abandoned row carries one today, so it's not worth a column in
// either the table or the export, but the detail view is the complete
// record and costs nothing to keep it in.
function patentDetailRows(p) {
  return [
    ['Code', p.code],
    ['MAHE / Non-MAHE', p.mahe],
    ['Name of Inventors', p.inventorName],
    ['Title of Invention', p.title],
    ['Applicant', p.applicantName],
    ['Patent Application No.', <AppNoValue value={p.applicationNumber} />],
    ['Status', p.status],
    ['D.O.F.', formatDate(p.dof)],
    ['Publication date', formatDate(p.dateOfPublication)],
    ['Publication number', p.publicationNumber],
    ['Form 9 filed', p.form9Filed],
    ['Form 18 filed', p.form18Filed],
    ['Date of grant', formatDate(p.dateOfGrant)],
    ['Assigned to', p.assignedTo],
  ];
}

// Read-only, sheet-derived list of every application whose Code cell is
// filled red in the sheet — no manual fields, so no edit UI. The sheet has
// no abandonment date or reason, hence an all-time list with no date filter.
function AbandonedPatents({ onSelectPatent }) {
  const isPhone = useIsPhone();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maheFilter, setMaheFilter] = useState('');
  const [codeTypeFilter, setCodeTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    return apiFetch(`${API_BASE}/api/abandoned-patents`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch abandoned patents'));
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

  // Scoped to the active MAHE filter so picking "MAHE" doesn't still offer
  // Non-MAHE-only prefixes (and vice versa).
  const codeTypes = useMemo(() => {
    if (!data) return [];
    const source = maheFilter ? data.patents.filter((p) => p.mahe === maheFilter) : data.patents;
    return [...new Set(source.map((p) => codePrefix(p.code)))].filter(Boolean).sort();
  }, [data, maheFilter]);

  // Drop a code-type selection that no longer belongs to the active MAHE
  // filter (e.g. switching to "MAHE" while a Non-MAHE-only prefix was picked).
  useEffect(() => {
    if (codeTypeFilter && !codeTypes.includes(codeTypeFilter)) setCodeTypeFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeTypes]);

  // Built from the STATUS values actually present rather than a fixed list,
  // so new sheet wording shows up on its own instead of silently vanishing
  // from the filter.
  const statuses = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.patents.map((p) => String(p.status || '').trim()))].filter(Boolean).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.patents;
    if (maheFilter) list = list.filter((p) => p.mahe === maheFilter);
    if (codeTypeFilter) list = list.filter((p) => codePrefix(p.code) === codeTypeFilter);
    if (statusFilter) list = list.filter((p) => String(p.status || '').trim() === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.applicationNumber || '').toLowerCase().includes(q) ||
          (p.inventorName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, maheFilter, codeTypeFilter, statusFilter, search]);

  // Phones page the list (desktop shows everything).
  const pager = usePhonePage([maheFilter, codeTypeFilter, statusFilter, search].join('|'), filtered.length);

  if (!data && loading) return <div className="state"><p>Loading abandoned patents…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const maheCount = data ? data.patents.filter((p) => p.mahe === 'MAHE').length : 0;
  const nonMaheCount = data ? data.patents.filter((p) => p.mahe === 'Non-MAHE').length : 0;
  const unclassifiedCount = data ? data.patents.filter((p) => p.mahe === 'Unclassified').length : 0;
  const hasActiveFilter = Boolean(maheFilter || codeTypeFilter || statusFilter || search.trim());

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    exportAbandonedPatentsToExcel(filtered, ABANDONED_PATENTS_COLUMNS, `Abandoned_patents_${today}.xlsx`)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const searchInput = (
    <input
      id="abandoned-search"
      className="input"
      type="text"
      placeholder="Code, title, inventor or application number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const codeTypeSelect = (
    <select
      id="abandoned-code-type"
      className="select"
      value={codeTypeFilter}
      onChange={(e) => setCodeTypeFilter(e.target.value)}
    >
      <option value="">All</option>
      {codeTypes.map((prefix) => (
        <option key={prefix} value={prefix}>{prefix}</option>
      ))}
    </select>
  );

  const statusSelect = (
    <select
      id="abandoned-status"
      className="select"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
    >
      <option value="">All</option>
      {statuses.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">Abandoned patents</h1>
        <p className="page-meta">
          {hasActiveFilter ? `${filtered.length} of ${data.count} shown` : `${data.count} abandoned`}
        </p>
      </div>

      {data.flagsUnavailable && (
        <div className="error" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
          Could not read the sheet&apos;s red Code cells, so this list may be incomplete.
          Try Refresh sheet; if it keeps happening, check the backend logs.
        </div>
      )}

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, title, app no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'abandoned-code-type', label: 'Code type', control: codeTypeSelect },
            { id: 'abandoned-status', label: 'Status', control: statusSelect },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filtered.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="abandoned-search">Search</label>
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
            <label className="field-label" htmlFor="abandoned-code-type">Code type</label>
            {codeTypeSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="abandoned-status">Status</label>
            {statusSelect}
          </div>

          <div className="filter-total" title="Abandoned patents matching the filters above">
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
          label="All abandoned"
          active={maheFilter === ''}
          onClick={() => setMaheFilter('')}
        />
        <SummaryCard
          value={maheCount}
          label="MAHE"
          active={maheFilter === 'MAHE'}
          onClick={() => setMaheFilter('MAHE')}
        />
        <SummaryCard
          value={nonMaheCount}
          label="Non-MAHE"
          active={maheFilter === 'Non-MAHE'}
          onClick={() => setMaheFilter('Non-MAHE')}
        />
        {unclassifiedCount > 0 && (
          <SummaryCard
            value={unclassifiedCount}
            label="Unclassified"
            active={maheFilter === 'Unclassified'}
            onClick={() => setMaheFilter('Unclassified')}
          />
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="state">
          <p className="state-title">No abandoned patents</p>
          <p>{hasActiveFilter ? 'Clear the search or choose a different filter.' : 'None marked as abandoned.'}</p>
        </div>
      ) : isPhone ? (
        <>
          <MobileCardList>
            {pager.slice(filtered).map((p) => {
              const codeType = codePrefix(p.code);
              return (
                <MobileCard
                  key={p.code}
                  code={<>{p.code}<span className="abandoned-badge">Abandoned</span></>}
                  onOpen={() => onSelectPatent(p.code, patentDetailRows(p), p)}
                  tone="bad"
                  title={p.title}
                  text={isBlankValue(p.status) ? '' : String(p.status)}
                  pills={[
                    p.mahe && (
                      <span key="mahe" className={`mahe-pill ${p.mahe === 'MAHE' ? 'is-mahe' : ''}`}>{p.mahe}</span>
                    ),
                    codeType && <span key="type" className="status-pill">{codeType}</span>,
                  ]}
                  footerLeft={<AppNoValue value={p.applicationNumber} />}
                  footerRight={p.dof ? `Filed ${formatDate(p.dof)}` : ''}
                />
              );
            })}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : (
        <div className="table-wrap">
          <table className="abandoned-table">
            <thead>
              <tr>
                <th className="col-code">Code</th>
                <th className="col-mahe">MAHE / Non-MAHE</th>
                <th className="col-appno">Patent application no.</th>
                <th className="col-title">Title of invention</th>
                <th className="col-status">Status</th>
                <th className="col-dof">D.O.F.</th>
                <th className="col-owner">Assigned to</th>
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
                  <td className="col-mahe" data-label="MAHE / Non-MAHE">{p.mahe}</td>
                  <td className="col-appno" data-label="Patent application no."><AppNoValue value={p.applicationNumber} /></td>
                  <td className="cell-title col-title" data-label="Title of invention">{p.title || '—'}</td>
                  <td className="col-status" data-label="Status">{p.status || '—'}</td>
                  <td className="col-dof" data-label="D.O.F.">{formatDate(p.dof) || '—'}</td>
                  <td className="col-owner" data-label="Assigned to"><Assignee name={p.assignedTo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AbandonedPatents;
