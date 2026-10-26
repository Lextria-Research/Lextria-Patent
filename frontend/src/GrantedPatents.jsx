import { useState, useEffect, useMemo, useRef } from 'react';
import Assignee from './Assignee';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { formatDate, renewalLabel, codePrefix } from './dueConstants';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import MobileCard, { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';
import { exportDuesToExcel, GRANTED_PATENTS_COLUMNS } from './exportExcel';
import { AppNoValue } from './CopyButton';

// Same field set as GRANTED_PATENTS_COLUMNS (export), plus Inventor Name —
// the code-click detail view shows exactly this, not the raw 66-column
// LR record dump.
function patentDetailRows(p) {
  return [
    ['Code', p.code],
    ['MAHE / Non-MAHE', p.mahe],
    ['Application number', <AppNoValue value={p.applicationNumber} />],
    ['Title', p.title],
    ['Applicant', p.applicantName],
    ['Inventor Name', p.inventorName],
    ['Filing (PS)', formatDate(p.dateOfFilingPS)],
    ['Filing (CS)', formatDate(p.dateOfFilingCS)],
    ['Publication date', formatDate(p.dateOfPublication)],
    ['Publication number', p.publicationNumber],
    ['Date of grant', formatDate(p.dateOfGrant)],
    ['Renewal date', formatDate(p.dateOfRenewal)],
    ['Next renewal', formatDate(p.nextRenewal)],
    ['Assigned to', p.assignedTo],
  ];
}

// Read-only, sheet-derived list — no manual/editable fields, so no edit UI.
function GrantedPatents({ onSelectPatent }) {
  const isPhone = useIsPhone();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maheFilter, setMaheFilter] = useState('');
  const [codeTypeFilter, setCodeTypeFilter] = useState('');
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
    return apiFetch(`${API_BASE}/api/granted-patents`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch granted patents'));
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

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.patents;
    if (maheFilter) list = list.filter((p) => p.mahe === maheFilter);
    if (codeTypeFilter) list = list.filter((p) => codePrefix(p.code) === codeTypeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.applicationNumber || '').toLowerCase().includes(q) ||
          (p.publicationNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, maheFilter, codeTypeFilter, search]);

  // Phones page the list (desktop shows everything).
  const pager = usePhonePage([maheFilter, codeTypeFilter, search].join('|'), filtered.length);

  if (!data && loading) return <div className="state"><p>Loading granted patents…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const maheCount = data ? data.patents.filter((p) => p.mahe === 'MAHE').length : 0;
  const nonMaheCount = data ? data.patents.filter((p) => p.mahe === 'Non-MAHE').length : 0;
  const unclassifiedCount = data ? data.patents.filter((p) => p.mahe === 'Unclassified').length : 0;
  const hasActiveFilter = Boolean(maheFilter || codeTypeFilter || search.trim());

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    exportDuesToExcel(filtered, GRANTED_PATENTS_COLUMNS, `Granted_patents_${today}.xlsx`)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const searchInput = (
    <input
      id="granted-search"
      className="input"
      type="text"
      placeholder="Code, title, application or publication number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const codeTypeSelect = (
    <select
      id="granted-code-type"
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

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">Granted patents</h1>
        <p className="page-meta">
          {hasActiveFilter ? `${filtered.length} of ${data.count} shown` : `${data.count} granted`}
        </p>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, title, app no., pub. no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'granted-code-type', label: 'Code type', control: codeTypeSelect },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filtered.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="granted-search">Search</label>
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
            <label className="field-label" htmlFor="granted-code-type">Code type</label>
            {codeTypeSelect}
          </div>

          <div className="filter-total" title="Granted patents matching the filters above">
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
          label="All granted"
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
          <p className="state-title">No granted patents</p>
          <p>{hasActiveFilter ? 'Clear the search or choose a different filter.' : 'None marked as granted yet.'}</p>
        </div>
      ) : isPhone ? (
        <>
          <MobileCardList>
            {pager.slice(filtered).map((p) => {
              const renewal = renewalLabel(p);
              return (
                <MobileCard
                  key={p.code}
                  code={p.code}
                  onOpen={() => onSelectPatent(p.code, patentDetailRows(p), p)}
                  tone={p.isRenewalOverdue ? 'bad' : undefined}
                  title={p.title}
                  pills={[
                    p.mahe && (
                      <span key="mahe" className={`mahe-pill ${p.mahe === 'MAHE' ? 'is-mahe' : ''}`}>{p.mahe}</span>
                    ),
                    renewal && (
                      <span key="renewal" className={`status-pill ${renewal.overdue ? 'is-overdue' : ''}`}>
                        {renewal.text}
                      </span>
                    ),
                  ]}
                  footerLeft={<AppNoValue value={p.applicationNumber} />}
                  footerRight={p.dateOfGrant ? `Granted ${formatDate(p.dateOfGrant)}` : ''}
                />
              );
            })}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : (
        <div className="table-wrap">
          <table className="granted-table">
            <thead>
              <tr>
                <th className="col-code">Code</th>
                <th className="col-mahe">MAHE / Non-MAHE</th>
                <th className="col-appno">Application no.</th>
                <th className="col-title">Title</th>
                <th className="col-applicant">Applicant</th>
                <th className="col-ps">Filing (PS)</th>
                <th className="col-cs">Filing (CS)</th>
                <th className="col-pubdate">Publication date</th>
                <th className="col-pubno">Publication no.</th>
                <th className="col-grant">Date of grant</th>
                <th className="col-renewal">Renewal date</th>
                <th className="col-next-renewal">Next renewal</th>
                <th className="col-owner">Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.code} className={p.isRenewalOverdue ? 'is-overdue' : ''}>
                  <td className="col-code">
                    <button className="link-btn" onClick={() => onSelectPatent(p.code, patentDetailRows(p))}>
                      {p.code}
                    </button>
                  </td>
                  <td className="col-mahe" data-label="MAHE / Non-MAHE">{p.mahe}</td>
                  <td className="col-appno" data-label="Application no."><AppNoValue value={p.applicationNumber} /></td>
                  <td className="cell-title col-title" data-label="Title">{p.title}</td>
                  <td className="col-applicant" data-label="Applicant">{p.applicantName}</td>
                  <td className="col-ps" data-label="Filing (PS)">{formatDate(p.dateOfFilingPS) || '—'}</td>
                  <td className="col-cs" data-label="Filing (CS)">{formatDate(p.dateOfFilingCS) || '—'}</td>
                  <td className="col-pubdate" data-label="Publication date">{formatDate(p.dateOfPublication) || '—'}</td>
                  <td className="col-pubno" data-label="Publication no.">{p.publicationNumber || '—'}</td>
                  <td className="col-grant" data-label="Date of grant">{formatDate(p.dateOfGrant) || '—'}</td>
                  <td className="col-renewal" data-label="Renewal date">{formatDate(p.dateOfRenewal) || '—'}</td>
                  <td className="col-next-renewal" data-label="Next renewal">{formatDate(p.nextRenewal) || '—'}</td>
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

export default GrantedPatents;
