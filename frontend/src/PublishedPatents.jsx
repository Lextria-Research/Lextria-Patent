import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { formatDate, isBlankValue, codePrefix } from './dueConstants';
import { exportDuesToExcel, PUBLISHED_PATENTS_COLUMNS, ABANDONED_CODE_SHADING } from './exportExcel';
import { AppNoValue } from './CopyButton';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import MobileCard, { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Read-only, sheet-derived list — no manual/editable fields, so no edit UI.
// month/year are either a number or the string 'all' — 'all' for year
// ignores month too (true all-time total); 'all' for month with a real
// year covers every month in just that year.
// Same field set as PUBLISHED_PATENTS_COLUMNS (export) — the code-click
// detail view shows exactly this, not the raw 66-column LR record dump.
function patentDetailRows(p) {
  return [
    ['Code', p.code],
    ['Name of Inventors', p.inventorName],
    ['MAHE / Non-MAHE', p.mahe],
    ['Institution / Company', p.institutionCompany],
    ['Title of Invention', p.title],
    ['Applicant', p.applicantName],
    ['Patent Application No.', <AppNoValue value={p.applicationNumber} />],
    ['D.O.F.', formatDate(p.dof)],
    ['Classification', p.classification],
    ['Date of publication', formatDate(p.dateOfPublication)],
    ['Publication number', p.publicationNumber],
    ['Form 18 filed', p.form18Filed],
  ];
}

function PublishedPatents({ onSelectPatent }) {
  const isPhone = useIsPhone();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
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
    return apiFetch(`${API_BASE}/api/published-patents?month=${month}&year=${year}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch published patents'));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // A publication can't be dated in the future, so switching to the
  // current year must not leave a later month still selected. Switching
  // to "All years" also forces month to "all" since it's ignored server-side.
  useEffect(() => {
    if (year === 'all') {
      if (month !== 'all') setMonth('all');
      return;
    }
    if (year === currentYear && month !== 'all' && month > currentMonth) setMonth(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

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
  const pager = usePhonePage([month, year, maheFilter, codeTypeFilter, search].join('|'), filtered.length);

  if (!data && loading) return <div className="state"><p>Loading published patents…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const monthLabel =
    year === 'all' ? 'All time'
    : month === 'all' ? `All months, ${year}`
    : `${MONTHS[month - 1]} ${year}`;
  const maheCount = data ? data.patents.filter((p) => p.mahe === 'MAHE').length : 0;
  const nonMaheCount = data ? data.patents.filter((p) => p.mahe === 'Non-MAHE').length : 0;
  const unclassifiedCount = data ? data.patents.filter((p) => p.mahe === 'Unclassified').length : 0;
  const hasActiveFilter = Boolean(maheFilter || codeTypeFilter || search.trim());

  const handleExport = () => {
    const safeLabel = monthLabel.replace(/[,\s]+/g, '_');
    exportDuesToExcel(filtered, PUBLISHED_PATENTS_COLUMNS, `Published_patents_${safeLabel}.xlsx`, ABANDONED_CODE_SHADING)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const monthSelect = (
    <select
      id="published-month"
      className="select"
      value={month}
      disabled={year === 'all'}
      onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
    >
      <option value="all">All months</option>
      {MONTHS.map((m, i) => {
        const value = i + 1;
        if (year === currentYear && value > currentMonth) return null;
        return <option key={i} value={value}>{m}</option>;
      })}
    </select>
  );

  const yearSelect = (
    <select
      id="published-year"
      className="select"
      value={year}
      onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
    >
      <option value="all">All years</option>
      {Array.from({ length: 10 }, (_, i) => currentYear - 9 + i).map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );

  const searchInput = (
    <input
      id="published-search"
      className="input"
      type="text"
      placeholder="Code, title, application or publication number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const codeTypeSelect = (
    <select
      id="published-code-type"
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
        <h1 className="page-title">Published patents — {monthLabel}</h1>
        <p className="page-meta">
          {hasActiveFilter ? `${filtered.length} of ${data.count} shown` : `${data.count} published`}
        </p>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, title, app no., pub. no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'published-month', label: 'Month', control: monthSelect },
            { id: 'published-year', label: 'Year', control: yearSelect },
            { id: 'published-code-type', label: 'Code type', control: codeTypeSelect },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filtered.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="published-month">Month</label>
            {monthSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="published-year">Year</label>
            {yearSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="published-search">Search</label>
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
            <label className="field-label" htmlFor="published-code-type">Code type</label>
            {codeTypeSelect}
          </div>
        </div>
      )}

      <div className="summary-cards">
        <SummaryCard
          value={data.count}
          label="All published"
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

      {!isPhone && (
        <div className="toolbar">
          <div className="filter-total" title="Published patents matching the filters above">
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

      {filtered.length === 0 ? (
        <div className="state">
          <p className="state-title">No published patents</p>
          <p>
            {hasActiveFilter
              ? 'Clear the search or choose a different filter.'
              : year === 'all'
                ? 'Nothing published yet.'
                : `Nothing published in ${monthLabel}. Pick another month to keep looking.`}
          </p>
        </div>
      ) : isPhone ? (
        <>
          <MobileCardList>
            {pager.slice(filtered).map((p) => (
              <MobileCard
                key={p.code}
                code={<>{p.code}{p.isAbandoned && <span className="abandoned-badge">Abandoned</span>}</>}
                onOpen={() => onSelectPatent(p.code, patentDetailRows(p), p)}
                tone={p.isAbandoned ? 'bad' : undefined}
                title={p.title}
                pills={[
                  p.mahe && (
                    <span key="mahe" className={`mahe-pill ${p.mahe === 'MAHE' ? 'is-mahe' : ''}`}>{p.mahe}</span>
                  ),
                  p.classification && <span key="class" className="status-pill">{p.classification}</span>,
                ]}
                note={isBlankValue(p.publicationNumber) ? '' : `Publication no.: ${p.publicationNumber}`}
                footerLeft={<AppNoValue value={p.applicationNumber} />}
                footerRight={p.dateOfPublication ? `Published ${formatDate(p.dateOfPublication)}` : ''}
              />
            ))}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : (
        <div className="table-wrap">
          <table className="published-table">
            <thead>
              <tr>
                <th className="col-code">Code</th>
                <th className="col-mahe">MAHE / Non-MAHE</th>
                <th className="col-title">Title of invention</th>
                <th className="col-applicant">Applicant</th>
                <th className="col-appno">Patent application no.</th>
                <th className="col-dof">D.O.F.</th>
                <th className="col-classification">Classification</th>
                <th className="col-pubdate">Date of publication</th>
                <th className="col-pubno">Publication no.</th>
                <th className="col-form18">Form 18 filed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.code} className={p.isAbandoned ? 'is-abandoned' : ''}>
                  <td className="col-code">
                    <button className="link-btn" onClick={() => onSelectPatent(p.code, patentDetailRows(p))}>
                      {p.code}
                    </button>
                    {p.isAbandoned && <span className="abandoned-badge">Abandoned</span>}
                  </td>
                  <td className="col-mahe" data-label="MAHE / Non-MAHE">{p.mahe}</td>
                  <td className="cell-title col-title" data-label="Title of invention">{p.title}</td>
                  <td className="col-applicant" data-label="Applicant">{p.applicantName}</td>
                  <td className="col-appno" data-label="Patent application no."><AppNoValue value={p.applicationNumber} /></td>
                  <td className="col-dof" data-label="D.O.F.">{formatDate(p.dof) || '—'}</td>
                  <td className="col-classification" data-label="Classification">{p.classification || '—'}</td>
                  <td className="col-pubdate" data-label="Date of publication">{formatDate(p.dateOfPublication) || '—'}</td>
                  <td className="col-pubno" data-label="Publication no.">{p.publicationNumber || '—'}</td>
                  <td className="col-form18" data-label="Form 18 filed">{p.form18Filed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PublishedPatents;
