import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { SummaryCard } from './DueTable';
import DueDashboardTable from './DueDashboardTable';
import LiveDueTracker from './LiveDueTracker';
import DueMobileCard from './DueMobileCard';
import { MobileCardList } from './MobileCard';
import { DUE_TYPE_OPTIONS, keyOf } from './dueConstants';
import { MANUAL_ASSIGN_TYPES } from './DueTable';
import { exportDuesToExcel, DUE_DASHBOARD_COLUMNS } from './exportExcel';
import { useIsPhone } from './useIsPhone';
import PhoneToolbar from './PhoneToolbar';
import { usePhonePage, PhonePager } from './PhonePager';

// Desktop's page here is bigger than the phone list's 25 — this is the one
// list in the app big enough to need desktop paging at all (see PhonePager.js),
// so it gets a page size suited to a full table instead of a card stack.
const DESKTOP_PAGE_SIZE = 100;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// `view` ('monthly' | 'dueSoon') lives in App, not here: opening a due's
// detail page unmounts this component, and going Back should land on the
// same view the user left.
function DueDashboard({ onSelectDue, view, onViewChange, theme, onToggleTheme }) {
  const isPhone = useIsPhone();
  const now = new Date();
  const currentYear = now.getFullYear();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [dueTypeFilter, setDueTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('');
  const [showIssues, setShowIssues] = useState(false);
  // Abandoned applications never need action, so they're excluded by
  // default — toggle shows them back if someone wants to check.
  const [includeAbandoned, setIncludeAbandoned] = useState(false);
  const [toast, setToast] = useState(null);
  // Bumped to make the Due soon view re-read after a save.
  const [dueSoonKey, setDueSoonKey] = useState(0);
  const issuesRef = useRef(null);
  const toastTimerRef = useRef(null);

  const showToast = (type, message) => {
    clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const loadDues = () => {
    setLoading(true);
    setError(null);
    return apiFetch(`${API_BASE}/api/dues?month=${month}&year=${year}&includeAbandoned=${includeAbandoned}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch dues'));
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
    setDeadlineFilter('');
    setShowIssues(false);
    loadDues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // There's no sensible "this one month, every year" query, so All years
  // always carries All months with it.
  useEffect(() => {
    if (year === 'all' && month !== 'all') setMonth('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Separate from the month/year effect above so toggling this doesn't
  // also reset the deadline filter or close the data-issues panel.
  useEffect(() => {
    loadDues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeAbandoned]);

  // Forces the backend to re-read the LR Sheet right now instead of
  // waiting for its 5-minute background refresh, then reloads this page.
  const handleRefresh = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/api/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(await serverErrorMessage(res, 'Refresh failed'));
      await loadDues();
      showToast('success', 'Sheet refreshed');
    } catch (err) {
      showToast('error', `Refresh failed — ${isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message}`);
    }
  };

  // Update one row in place after a save, instead of re-reading the whole LR
  // Sheet. A no-op when the saved due isn't in the month being shown.
  const mergeSavedEntry = (entry) => {
    setData((prev) => {
      if (!prev) return prev;
      const dues = prev.dues.map((d) => {
        if (keyOf(d) !== `${entry.code}|${entry.type_of_due}|${entry.due_date}`) return d;
        // assigned_to in the saved entry is only ever meaningful for FER/FORM 3
        // (saveDueFields sends null for every other type, since only those two
        // are manually assignable — see dueBuilder.js's resolveAssignee). Every
        // other due type's displayed name comes from the LR Sheet, so a save
        // that didn't touch Assigned to must leave it exactly as it was.
        const canAssign = MANUAL_ASSIGN_TYPES.includes(d.dueType);
        return {
          ...d,
          manual: entry,
          assignedTo: canAssign ? (entry.assigned_to || '') : d.assignedTo,
          status: d.canSetStatus && entry.status ? entry.status : d.status,
        };
      });
      const summary = {
        ...prev.summary,
        total: dues.length,
        completed: dues.filter((d) => d.status === 'completed').length,
        pending: dues.filter((d) => d.status === 'pending').length,
        overdue: dues.filter((d) => d.status === 'overdue').length,
      };
      return { ...prev, dues, summary };
    });
    setDueSoonKey((k) => k + 1);
    showToast('success', 'Saved');
  };

  const filteredDues = useMemo(() => {
    if (!data) return [];
    let list = data.dues;
    if (statusFilter) list = list.filter((d) => d.status === statusFilter);
    if (dueTypeFilter) list = list.filter((d) => d.dueType === dueTypeFilter);
    if (assigneeFilter) list = list.filter((d) => d.assignedTo === assigneeFilter);
    if (deadlineFilter) list = list.filter((d) => d.deadline === deadlineFilter);
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
  }, [data, statusFilter, dueTypeFilter, assigneeFilter, deadlineFilter, search]);

  // Called unconditionally, before the early returns below, per PhonePager's
  // own rule (it's a hook). Resets to page 1 by itself whenever any filter,
  // month or year changes — see usePhonePage's filterKey trick.
  const pager = usePhonePage(
    [month, year, statusFilter, dueTypeFilter, assigneeFilter, deadlineFilter, search].join('|'),
    filteredDues.length,
    isPhone ? undefined : DESKTOP_PAGE_SIZE
  );

  useEffect(() => {
    if (showIssues) issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showIssues]);

  if (!data && loading) return <div className="state"><p>Loading dues…</p></div>;
  if (error) return <div className="error">{error}</div>;

  const monthLabel =
    year === 'all' ? 'All time'
    : month === 'all' ? `All months, ${year}`
    : `${MONTHS[month - 1]} ${year}`;
  // "Paralegal" is never in the LR Sheet — it's added here so it can be
  // picked for renewals even though the backend only knows real sheet names.
  const assignees = [...(data.assignees || []), 'Paralegal'].sort();
  const hasActiveFilter = Boolean(
    statusFilter || dueTypeFilter || assigneeFilter || deadlineFilter || search.trim()
  );

  if (view === 'dueSoon') {
    return (
      <div>
        {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.message}</div>}
        <LiveDueTracker
          refreshKey={dueSoonKey}
          onSelectDue={onSelectDue}
          onBack={() => onViewChange('monthly')}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      </div>
    );
  }

  // Deadline filter's date input gets bounds only when a single month is
  // actually selected — All months/All years have no one range to clamp to.
  const pad = (n) => String(n).padStart(2, '0');
  const minDeadline = month === 'all' ? undefined : `${year}-${pad(month)}-01`;
  const maxDeadline = month === 'all' ? undefined : `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;

  const handleExport = () => {
    const safeLabel = monthLabel.replace(/[,\s]+/g, '_');
    exportDuesToExcel(filteredDues, DUE_DASHBOARD_COLUMNS, `Due_Dashboard_${safeLabel}.xlsx`)
      .catch((err) => showToast('error', `Export failed — ${err.message}`));
  };

  const monthSelect = (
    <select
      id="due-month"
      className="select"
      value={month}
      disabled={year === 'all'}
      onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
    >
      <option value="all">All months</option>
      {MONTHS.map((m, i) => (
        <option key={i} value={i + 1}>{m}</option>
      ))}
    </select>
  );

  const yearSelect = (
    <select
      id="due-year"
      className="select"
      value={year}
      onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
    >
      <option value="all">All years</option>
      {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((y) => (
        <option key={y} value={y}>{y}</option>
      ))}
    </select>
  );

  const searchInput = (
    <input
      id="due-search"
      className="input"
      type="text"
      placeholder="Code, title or application number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const dueTypeSelect = (
    <select
      id="due-type-filter"
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

  const assigneeSelect = (
    <select
      id="due-assignee-filter"
      className="select"
      value={assigneeFilter}
      onChange={(e) => setAssigneeFilter(e.target.value)}
    >
      <option value="">All</option>
      {assignees.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );

  const deadlineInput = (
    <input
      id="due-deadline-filter"
      type="date"
      className="input input-sm"
      value={deadlineFilter}
      min={minDeadline}
      max={maxDeadline}
      onChange={(e) => setDeadlineFilter(e.target.value)}
    />
  );

  const abandonedToggle = (
    <button
      type="button"
      id="due-include-abandoned"
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
        <h1 className="page-title">Dues for {monthLabel}</h1>
        <div className="page-head-side">
          <button className="btn due-soon-btn" onClick={() => onViewChange('dueSoon')}>Live Due Board</button>
          <p className="page-meta">
            {hasActiveFilter
              ? `${filteredDues.length} of ${data.summary.total} shown`
              : `${data.summary.total} dues`}
          </p>
        </div>
      </div>

      {loading && <p className="refreshing">Refreshing…</p>}

      {isPhone ? (
        <PhoneToolbar
          search={{ input: searchInput, placeholder: 'Search code, title, app no.', value: search, onClear: () => setSearch('') }}
          filters={[
            { id: 'due-month', label: 'Month', control: monthSelect },
            { id: 'due-year', label: 'Year', control: yearSelect },
            { id: 'due-type-filter', label: 'Due type', control: dueTypeSelect },
            { id: 'due-assignee-filter', label: 'Assigned to', control: assigneeSelect },
            { id: 'due-deadline-filter', label: 'Deadline', control: deadlineInput, wide: true, hint: 'dd-mm-yyyy', empty: deadlineFilter === '' },
            { id: 'due-include-abandoned', label: 'Abandoned', control: abandonedToggle },
          ]}
          actions={{ onRefresh: handleRefresh, refreshing: loading, onExport: handleExport, exportDisabled: filteredDues.length === 0 }}
        />
      ) : (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="due-month">Month</label>
            {monthSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="due-year">Year</label>
            {yearSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="due-search">Search</label>
            {searchInput}
          </div>
        </div>
      )}

      <div className="summary-cards">
        <SummaryCard
          value={data.summary.total}
          label="All dues"
          active={!showIssues && statusFilter === null}
          onClick={() => { setShowIssues(false); setStatusFilter(null); }}
        />
        <SummaryCard
          value={data.summary.completed}
          label="Completed"
          active={!showIssues && statusFilter === 'completed'}
          onClick={() => { setShowIssues(false); setStatusFilter('completed'); }}
        />
        <SummaryCard
          value={data.summary.pending}
          label="Pending"
          active={!showIssues && statusFilter === 'pending'}
          onClick={() => { setShowIssues(false); setStatusFilter('pending'); }}
        />
        <SummaryCard
          value={data.summary.overdue}
          label="Overdue"
          active={!showIssues && statusFilter === 'overdue'}
          onClick={() => { setShowIssues(false); setStatusFilter('overdue'); }}
        />
        <SummaryCard
          value={data.summary.dataIssues}
          label="Data issues"
          active={showIssues}
          onClick={data.dataIssues.length > 0 ? () => setShowIssues((v) => !v) : undefined}
        />
      </div>

      {!isPhone && (
        <div className="toolbar">
          <div className="field">
            <label className="field-label" htmlFor="due-type-filter">Due type</label>
            {dueTypeSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="due-assignee-filter">Assigned to</label>
            {assigneeSelect}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="due-deadline-filter">Deadline</label>
            {deadlineInput}
          </div>

          <div className="filter-total" title="Dues matching the filters above">
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

      {showIssues ? (
        <section className="issues" ref={issuesRef}>
          <h2 className="issues-title">
            {data.dataIssues.length} deadline{data.dataIssues.length === 1 ? '' : 's'} could not be read
          </h2>
          <p className="issues-note">
            These are missing from every month until the cell is corrected in the LR sheet.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-code">Code</th>
                  <th className="col-type">Due type</th>
                  <th>Source column</th>
                  <th>Value in sheet</th>
                  <th className="col-type">Problem</th>
                </tr>
              </thead>
              <tbody>
                {data.dataIssues.map((issue, i) => (
                  <tr key={i}>
                    <td className="col-code">{issue.code}</td>
                    <td className="col-type">{issue.dueType}</td>
                    <td>{issue.sourceColumn}</td>
                    <td className="mono">{issue.rawValue}</td>
                    <td className="col-type">{issue.problem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : filteredDues.length === 0 ? (
        <div className="state">
          <p className="state-title">No dues to show</p>
          <p>
            {hasActiveFilter
              ? 'Clear the search or choose a different filter.'
              : year === 'all'
                ? 'Nothing due at all, across every month and year.'
                : `Nothing falls due in ${monthLabel}. Pick another month to keep looking.`}
          </p>
        </div>
      ) : isPhone ? (
        // Phones: cards, view only (no edit control); tapping one opens the
        // same detail page the table's code link does.
        <>
          <MobileCardList>
            {pager.slice(filteredDues).map((d) => (
              <DueMobileCard key={keyOf(d)} due={d} onOpen={() => onSelectDue(d)} />
            ))}
          </MobileCardList>
          <PhonePager pager={pager} />
        </>
      ) : (
        <>
          <DueDashboardTable
            dues={pager.slice(filteredDues)}
            assignees={assignees}
            onSaveEntry={mergeSavedEntry}
            onError={(msg) => showToast('error', `Save failed — ${msg}`)}
            onSelectDue={onSelectDue}
          />
          <PhonePager pager={pager} />
        </>
      )}
    </div>
  );
}

export default DueDashboard;
