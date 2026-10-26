import { Fragment, useState, useEffect } from 'react';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import Assignee from './Assignee';
import { StatusBadge, SummaryCard, EditRow } from './DueTable';
import { keyOf, shortDueType, formatDueSoonDate } from './dueConstants';
import { useIsPhone } from './useIsPhone';
import DueMobileCard from './DueMobileCard';
import { MobileCardList } from './MobileCard';

const COLUMN_COUNT = 6;

const EMPTY_MESSAGE = {
  today: 'No dues today.',
  upcoming: 'No dues in the next 7 days.',
};

// The Due dashboard's "Due soon" view: every not-yet-completed due with a
// deadline today or in the next 7 days, split across two tabs (the count
// cards) — "today" and "upcoming" (after today). Loads from its own endpoint,
// so it ignores the month selector and the dashboard's filters; `refreshKey`
// changes whenever the parent wants it re-read (after a save).
function DueSoon({ assignees, refreshKey, onSelectDue, onSaved, onError, onBack }) {
  const isPhone = useIsPhone();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('today');
  const [editingKey, setEditingKey] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/api/due-soon`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await serverErrorMessage(res, 'Failed to fetch due soon'));
        return res.json();
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const todayDues = data ? data.dues.filter((d) => d.deadline === data.today) : [];
  const upcomingDues = data ? data.dues.filter((d) => d.deadline !== data.today) : [];
  const dues = tab === 'today' ? todayDues : upcomingDues;

  const selectTab = (next) => {
    setEditingKey(null);
    setTab(next);
  };

  const handleSaved = (entry) => {
    setEditingKey(null);
    onSaved(entry);
  };

  return (
    <section className="due-soon">
      <button className="btn due-soon-back" onClick={onBack}>← Back to monthly dues</button>

      <h2 className="due-soon-title">Due soon</h2>
      <p className="due-soon-note">Today and the next 7 days. Not affected by the month selector.</p>

      {error && <div className="error">{error}</div>}
      {!error && !data && <p className="refreshing">Loading…</p>}

      {data && (
        <>
          <div className="due-soon-cards">
            <div className="due-soon-today">
              <SummaryCard
                value={todayDues.length}
                label="Due today"
                active={tab === 'today'}
                onClick={() => selectTab('today')}
              />
            </div>
            <SummaryCard
              value={upcomingDues.length}
              label="Next 7 days"
              active={tab === 'upcoming'}
              onClick={() => selectTab('upcoming')}
            />
          </div>

          {dues.length === 0 ? (
            <p className="due-soon-empty">{EMPTY_MESSAGE[tab]}</p>
          ) : isPhone ? (
            <MobileCardList>
              {dues.map((d) => (
                <DueMobileCard
                  key={keyOf(d)}
                  due={d}
                  todayIso={data.today}
                  onOpen={() => onSelectDue(d)}
                />
              ))}
            </MobileCardList>
          ) : (
            <div className="table-wrap">
              <table className="due-soon-table">
                <thead>
                  <tr>
                    <th className="col-date">Deadline</th>
                    <th className="col-type">Due type</th>
                    <th className="col-code">Code</th>
                    <th className="col-status">Status</th>
                    <th className="col-owner">Assignee</th>
                    <th className="col-edit"></th>
                  </tr>
                </thead>
                <tbody>
                  {dues.map((d) => {
                    const k = keyOf(d);
                    const isEditing = editingKey === k;
                    return (
                      <Fragment key={k}>
                        <tr
                          className={[
                            d.deadline === data.today && 'is-today',
                            isEditing && 'is-editing',
                          ].filter(Boolean).join(' ')}
                        >
                          <td className="col-date" data-label="Deadline">
                            {formatDueSoonDate(d.deadline, data.today)}
                          </td>
                          <td
                            className="col-type"
                            data-label="Due type"
                            title={d.dueType === 'WRITTEN SUBMISSION' ? d.dueType : undefined}
                          >
                            {shortDueType(d.dueType)}
                          </td>
                          <td className="col-code">
                            <button className="link-btn" onClick={() => onSelectDue(d)}>
                              {d.code}
                            </button>
                          </td>
                          <td className="col-status" data-label="Status"><StatusBadge status={d.status} /></td>
                          <td className="col-owner" data-label="Assignee"><Assignee name={d.assignedTo} /></td>
                          <td className="col-edit">
                            <button
                              className="btn-icon"
                              onClick={() => setEditingKey(isEditing ? null : k)}
                              aria-label={isEditing ? 'Close' : 'Edit'}
                              title={isEditing ? 'Close' : 'Edit'}
                            >
                              {isEditing ? '✕' : '✎'}
                            </button>
                          </td>
                        </tr>
                        {isEditing && (
                          <EditRow
                            due={d}
                            assignees={assignees}
                            onSave={handleSaved}
                            onError={onError}
                            onCancel={() => setEditingKey(null)}
                            colSpan={COLUMN_COUNT}
                          />
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default DueSoon;
