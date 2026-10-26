import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import { formatDate, codePrefix } from './dueConstants';
import { exportPatentFiledToExcel, PATENT_FILED_COLUMNS, ABANDONED_CODE_SHADING } from './exportExcel';
import { AppNoValue } from './CopyButton';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import MobileCard, { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';

const PS_CS = 'PS-CS';
const PROVISIONAL = 'Provisional Specification';
const COMPLETE = 'Complete Specification';

// Classification dropdown. 'all' (the default) is every patent; 'both' is
// PS-only plus CS-only patents (PS-CS is left out); the rest show just their
// own classification.
const DEFAULT_CLASSIFICATION = 'all';
const CLASSIFICATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Both PS and CS' },
  { value: PS_CS, label: 'PS-CS' },
  { value: PROVISIONAL, label: 'Provisional Specification' },
  { value: COMPLETE, label: 'Complete Specification' },
];

function matchesClassification(patent, filter) {
  if (filter === 'all') return true;
  if (filter === 'both') return patent.classification !== PS_CS;
  return patent.classification === filter;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Read-only, sheet-derived list — no manual/editable fields, so no edit UI.
// month/year are either a number or the string 'all' — 'all' for year
// ignores month too (true all-time total); 'all' for month with a real
// year covers every month in just that year.
// Same field set as PATENT_FILED_COLUMNS (export) — the code-click detail
// view shows exactly this, not the raw 66-column LR record dump.
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
    ['Publication status', p.publicationStatus],
    ['Date of publication', formatDate(p.dateOfPublication)],
  ];
}

// The sheet uses a lone "-" for "none"; the card hides such a line like an empty one.
const isBlank = (v) => ['', '-', '—'].includes(String(v ?? '').trim());

function PatentFiled({ onSelectPatent }) {
  const isPhone = useIsPhone();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [dofFrom, setDofFrom] = useState('');
  const [dofTo, setDofTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maheFilter, setMaheFilter] = useState('');
  const [codeTypeFilter, setCodeTypeFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState(DEFAULT_CLASSIFICATION);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // An exact D.O.F. date range, picked like Due dashboard's Deadline filter
  // but as a from/to pair. It can span any months/years, so it doesn't fit
  // the server's month+year query — instead it pulls the all-time list (same
  // request as "All years") and narrows it client-side, in `scoped` below.
  const isDateRange = Boolean(dofFrom || dofTo);

  const loadPatents = () => {
    setLoading(true);
    setError(null);
    return apiFetch(`${API_BASE}/api/patent-filed?month=${month}&year=${year}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch patent filed list'));
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

  // A filing can't be dated in the future, so switching to the current
  // year must not leave a later month still selected. Switching to
  // "All years" also forces month to "all" since it's ignored server-side.
  useEffect(() => {
    if (year === 'all') {
      if (month !== 'all') setMonth('all');
      return;
    }
    if (year === currentYear && month !== 'all' && month > currentMonth) setMonth(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Picking a date-range bound switches to the all-time fetch, same as
  // choosing "All years" — Month/Year stop meaning anything once a date
  // range is active.
  useEffect(() => {
    if (isDateRange && year !== 'all') setYear('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDateRange]);

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

  // The month's (or date range's) patents narrowed by the Classification
  // dropdown. The header count and the MAHE cards count this set, so they
  // always add up to the rows the current Classification/date range is
  // showing (Code type, MAHE card and search then narrow it further
  // without changing the counts).
  const scoped = useMemo(() => {
    if (!data) return [];
    let list = data.patents.filter((p) => matchesClassification(p, classificationFilter));
    if (isDateRange) {
      if (dofFrom) list = list.filter((p) => p.dof && p.dof >= dofFrom);
      if (dofTo) list = list.filter((p) => p.dof && p.dof <= dofTo);
    }
    return list;
  }, [data, classificationFilter, isDateRange, dofFrom, dofTo]);

  // Scoped to the active MAHE filter so picking "MAHE" doesn't still offer
  // Non-MAHE-only prefixes (and vice versa), and to the Classification so a
  // prefix that only has hidden PS-CS patents isn't offered.
  const codeTypes = useMemo(() => {
    const source = maheFilter ? scoped.filter((p) => p.mahe === maheFilter) : scoped;
    return [...new Set(source.map((p) => codePrefix(p.code)))].filter(Boolean).sort();
  }, [scoped, maheFilter]);

  // Drop a code-type selection that no longer belongs to the active MAHE
  // filter (e.g. switching to "MAHE" while a Non-MAHE-only prefix was picked).
  useEffect(() => {
    if (codeTypeFilter && !codeTypes.includes(codeTypeFilter)) setCodeTypeFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeTypes]);

  const filtered = useMemo(() => {
    let list = scoped;
    if (maheFilter) list = list.filter((p) => p.mahe === maheFilter);
    if (codeTypeFilter) list = list.filter((p) => codePrefix(p.code) === codeTypeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.applicationNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [scoped, maheFilter, codeTypeFilter, search]);

  // Phones page the list (desktop shows everything).
  const pager = usePhonePage(
    [month, year, dofFrom, dofTo, maheFilter, codeTypeFilter, classificationFilter, search].join('|'),
    filtered.length
  );

  if (!data && loading) return <div className="state"><p>Loading patent filed list…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const monthLabel =
    isDateRange ? `${dofFrom ? formatDate(dofFrom) : 'the start'} – ${dofTo ? formatDate(dofTo) : 'now'}`
    : year === 'all' ? 'All time'
    : month === 'all' ? `All months, ${year}`
    : `${MONTHS[month - 1]} ${year}`;
  const maheCount = scoped.filter((p) => p.mahe === 'MAHE').length;
  const nonMaheCount = scoped.filter((p) => p.mahe === 'Non-MAHE').length;
  const unclassifiedCount = scoped.filter((p) => p.mahe === 'Unclassified').length;
  // Classification isn't counted here: it sets what `scoped` is, so it's
  // already part of the totals rather than a narrowing of them.
  const hasActiveFilter = Boolean(maheFilter || codeTypeFilter || search.trim());

  const handleExport = () => {
    const safeLabel = monthLabel.replace(/[,\s]+/g, '_');
    exportPatentFiledToExcel(filtered, PATENT_FILED_COLUMNS, `Patent_filed_${safeLabel}.xlsx`, ABANDONED_CODE_SHADING)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const monthSelect = (
    <select
      id="filed-month"
      className="select"
      value={month}
      disabled={year === 'all' || isDateRange}
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
      id="filed-year"
      className="select"
      value={year}
      disabled={isDateRange}
      onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
    >
      <option value="all">All years</option>
      {Array.from({ length: 10 }, (_, i) => currentYear - 9 + i).map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );

  const dofFromInput = (
    <input
      id="filed-dof-from"
      type="date"
      className="input input-sm"
      value={dofFrom}
      max={dofTo || undefined}
      onChange={(e) => setDofFrom(e.target.value)}
    />
  );

  const dofToInput = (
    <input
      id="filed-dof-to"
      type="date"
      className="input input-sm"
      value={dofTo}
      min={dofFrom || undefined}
      onChange={(e) => setDofTo(e.target.value)}
    />
  );

  const searchInput = (
    <input
      id="filed-search"
      className="input"
      type="text"
      placeholder="Code, title or application number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const codeTypeSelect = (
    <select
      id="filed-code-type"
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

  const classificationSelect = (
    <select
      id="filed-classification"
      className="select"
      value={classificationFilter}
      onChange={(e) => setClassificationFilter(e.target.value)}
    >
      {CLASSIFICATION_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">Patent filed — {monthLabel}</h1>
        <p className="page-meta">
          {hasActiveFilter ? `${filtered.length} of ${scoped.length} shown` : `${scoped.length} filed`}
        </p>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, title, app no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'filed-month', label: 'Month', control: monthSelect },
            { id: 'filed-year', label: 'Year', control: yearSelect },
            { id: 'filed-code-type', label: 'Code type', control: codeTypeSelect },
            { id: 'filed-classification', label: 'Classification', control: classificationSelect },
            { id: 'filed-dof-from', label: 'Filed from', control: dofFromInput, hint: 'dd-mm-yyyy', empty: dofFrom === '' },
            { id: 'filed-dof-to', label: 'Filed to', control: dofToInput, hint: 'dd-mm-yyyy', empty: dofTo === '' },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filtered.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="filed-month">Month</label>
            {monthSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filed-year">Year</label>
            {yearSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filed-dof-from">Filed from</label>
            {dofFromInput}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filed-dof-to">Filed to</label>
            {dofToInput}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filed-search">Search</label>
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
            <label className="field-label" htmlFor="filed-code-type">Code type</label>
            {codeTypeSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="filed-classification">Classification</label>
            {classificationSelect}
          </div>
        </div>
      )}

      <div className="summary-cards">
        <SummaryCard
          value={scoped.length}
          label="All filed"
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
          <div className="filter-total" title="Patent filings matching the filters above">
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
          <p className="state-title">No patents filed</p>
          <p>
            {hasActiveFilter
              ? 'Clear the search or choose a different filter.'
              : scoped.length === 0 && data.patents.length > 0
                ? 'Nothing matches this Classification here. Choose another Classification, such as All.'
              : isDateRange
                ? 'Nothing filed in this date range.'
              : year === 'all'
                ? 'Nothing filed yet.'
                : `Nothing filed in ${monthLabel}. Pick another month to keep looking.`}
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
                subtitle={isBlank(p.institutionCompany) ? '' : p.institutionCompany}
                pills={[
                  p.mahe && (
                    <span key="mahe" className={`mahe-pill ${p.mahe === 'MAHE' ? 'is-mahe' : ''}`}>{p.mahe}</span>
                  ),
                  p.classification && <span key="class" className="status-pill">{p.classification}</span>,
                  p.publicationStatus === 'Published' ? (
                    <span key="pub" className="status-pill is-published">
                      {`Published ${formatDate(p.dateOfPublication)}`.trim()}
                    </span>
                  ) : (
                    <span key="pub" className="status-pill">Not published</span>
                  ),
                ]}
                footerLeft={<AppNoValue value={p.applicationNumber} />}
                footerRight={p.dof ? `Filed ${formatDate(p.dof)}` : ''}
              />
            ))}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : (
        <div className="table-wrap">
          <table className="patent-filed-table">
            <thead>
              <tr>
                <th className="col-code">Code</th>
                <th className="col-mahe">MAHE / Non-MAHE</th>
                <th className="col-institution">Institution / Company</th>
                <th className="col-title">Title of invention</th>
                <th className="col-applicant">Applicant</th>
                <th className="col-appno">Patent application no.</th>
                <th className="col-dof">D.O.F.</th>
                <th className="col-classification">Classification</th>
                <th className="col-pubstatus">Publication status</th>
                <th className="col-pubdate">Date of publication</th>
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
                  <td className="col-institution" data-label="Institution / Company">{p.institutionCompany || '—'}</td>
                  <td className="cell-title col-title" data-label="Title of invention">{p.title}</td>
                  <td className="col-applicant" data-label="Applicant">{p.applicantName}</td>
                  <td className="col-appno" data-label="Patent application no."><AppNoValue value={p.applicationNumber} /></td>
                  <td className="col-dof" data-label="D.O.F.">{formatDate(p.dof) || '—'}</td>
                  <td className="col-classification" data-label="Classification">{p.classification || '—'}</td>
                  <td className="col-pubstatus" data-label="Publication status">{p.publicationStatus}</td>
                  <td className="col-pubdate" data-label="Date of publication">{formatDate(p.dateOfPublication) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PatentFiled;
