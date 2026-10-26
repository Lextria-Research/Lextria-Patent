import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import DueTable, { SummaryCard } from './DueTable';
import { DUE_TYPE_OPTIONS, keyOf } from './dueConstants';
import { exportDuesToExcel, OVERDUE_COLUMNS } from './exportExcel';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import DueMobileCard from './DueMobileCard';
import { MobileCardList } from './MobileCard';
import { usePhonePage, PhonePager } from './PhonePager';

function OverdueDashboard({ onSelectDue }) {
  const isPhone = useIsPhone();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dueTypeFilter, setDueTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  // Abandoned applications never need action, so they're excluded by
  // default — toggle shows them back if someone wants to check.
  const [includeAbandoned, setIncludeAbandoned] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadOverdue = () => {
    setLoading(true);
    setError(null);
    return apiFetch(`${API_BASE}/api/overdue?includeAbandoned=${includeAbandoned}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch overdue dues'));
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
    loadOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeAbandoned]);

  // Forces the backend to re-read the LR Sheet right now instead of
  // waiting for its 5-minute background refresh, then reloads this page.
  const handleRefresh = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(await serverErrorMessage(res, 'Refresh failed'));
      await loadOverdue();
      showToast('success', 'Sheet refreshed');
    } catch (err) {
      showToast('error', `Refresh failed — ${isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message}`);
    }
  };

  const filteredDues = useMemo(() => {
    if (!data) return [];
    let list = data.dues;
    if (dueTypeFilter) list = list.filter((d) => d.dueType === dueTypeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.code.toLowerCase().includes(q) ||
          (d.title || '').toLowerCase().includes(q) ||
          (d.applicationNumber || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [data, dueTypeFilter, search]);

  // Phones page the list (desktop shows everything).
  const pager = usePhonePage([dueTypeFilter, search].join('|'), filteredDues.length);

  if (!data && loading) return <div className="state"><p>Loading overdue dues…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const hasActiveFilter = Boolean(dueTypeFilter || search.trim());

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10);
    exportDuesToExcel(filteredDues, OVERDUE_COLUMNS, `Overdue_${today}.xlsx`)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const searchInput = (
    <input
      id="overdue-search"
      className="input"
      type="text"
      placeholder="Code, title or application number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const dueTypeSelect = (
    <select
      id="overdue-type-filter"
      className="select"
      value={dueTypeFilter}
      onChange={(e) => setDueTypeFilter(e.target.value)}
    >
      <option value="">All</option>
      {DUE_TYPE_OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );

  const abandonedToggle = (
    <button
      type="button"
      id="overdue-include-abandoned"
      className={`btn ${includeAbandoned ? 'is-active' : ''}`}
      aria-pressed={includeAbandoned}
      onClick={() => setIncludeAbandoned((v) => !v)}
    >
      {includeAbandoned ? 'Hide abandoned' : 'Show abandoned'}
    </button>
  );

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}

      <div className="page-head">
        <h1 className="page-title">Overdue</h1>
        <p className="page-meta">
          {hasActiveFilter
            ? `${filteredDues.length} of ${data.total} shown`
            : `${data.total} overdue`}
        </p>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      <div className="summary-cards">
        <SummaryCard
          value={data.total}
          label="Total overdue"
          active={dueTypeFilter === ''}
          onClick={() => setDueTypeFilter('')}
        />
        {DUE_TYPE_OPTIONS.map((t) => (
          <SummaryCard
            key={t}
            value={data.byType[t] || 0}
            label={t}
            active={dueTypeFilter === t}
            onClick={() => setDueTypeFilter(t)}
          />
        ))}
      </div>

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, title, app no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'overdue-type-filter', label: 'Due type', control: dueTypeSelect },
            { id: 'overdue-include-abandoned', label: 'Abandoned', control: abandonedToggle },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filteredDues.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="overdue-type-filter">Due type</label>
            {dueTypeSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="overdue-search">Search</label>
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

          <div className="filter-total" title="Overdue dues matching the filters above">
            {filteredDues.length}
          </div>

          {abandonedToggle}

          <button className="btn" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh sheet'}
          </button>

          <button className="btn" onClick={handleExport} disabled={filteredDues.length === 0}>
            Export to Excel
          </button>
        </div>
      )}

      {filteredDues.length === 0 ? (
        <div className="state">
          <p className="state-title">No overdue dues</p>
          <p>
            {hasActiveFilter
              ? 'Clear the search or choose a different due type.'
              : 'Nothing is overdue right now.'}
          </p>
        </div>
      ) : isPhone ? (
        // Phones: the Due dashboard's card (view only), then paging. A tap opens
        // the same detail page the table's code link does.
        <>
          <MobileCardList>
            {pager.slice(filteredDues).map((d) => (
              <DueMobileCard key={keyOf(d)} due={d} onOpen={() => onSelectDue(d)} />
            ))}
          </MobileCardList>

          <PhonePager pager={pager} />
        </>
      ) : (
        <DueTable dues={filteredDues} onSelectDue={onSelectDue} />
      )}
    </div>
  );
}

export default OverdueDashboard;
