import { useEffect, useRef, useState } from 'react';
import Assignee from './Assignee';
import { FormStatusCell, StatusBadge, MANUAL_ASSIGN_TYPES, STATUS_OPTIONS, saveDueFields } from './DueTable';
import { isNetworkError, NETWORK_ERROR_MESSAGE } from './errors';
import { keyOf, formatDate, shortDueType } from './dueConstants';
import { AppNoValue } from './CopyButton';

// A truncated single-line cell with the full text as a native tooltip —
// keeps every row one line tall even when a note runs to a paragraph.
function TruncatedCell({ text, className = '', label }) {
  const value = text || '';
  if (!value) return <td className={className} data-label={label}>—</td>;
  return (
    <td className={className} data-label={label}>
      <span className="cell-trunc" title={value}>{value}</span>
    </td>
  );
}

// Excel-style inline cell: double-click to edit, Enter or blur (clicking
// outside) saves, Esc cancels and reverts. `value` seeds the input; `display`
// is what the non-editing cell shows if it differs from the raw edit value
// (e.g. the checklist date's dd/mm/yyyy text vs. its yyyy-mm-dd input value).
// `kind` is 'text' | 'date' | 'select'; a select commits the instant an
// option is chosen, same as clicking outside a text/date cell would.
function EditableCell({
  value, display, renderDisplay, className, label, editing, saving,
  onStartEdit, onCommit, onCancel, kind = 'text', selectOptions, selectPlaceholder,
}) {
  const [draft, setDraft] = useState(value ?? '');
  // True once Enter/Esc has already resolved this edit, so the blur that
  // follows (removing the input from the DOM fires one) doesn't also commit.
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (editing) {
      setDraft(value ?? '');
      resolvedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    const shown = display !== undefined ? display : value;
    return (
      <td className={`${className} is-editable-cell`} data-label={label} onDoubleClick={onStartEdit} title="Double-click to edit">
        {renderDisplay ? renderDisplay(shown) : (shown ? <span className="cell-trunc">{shown}</span> : '—')}
      </td>
    );
  }

  const commit = (v) => {
    resolvedRef.current = true;
    onCommit(v);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && kind !== 'select') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      resolvedRef.current = true;
      onCancel();
    }
  };
  const handleBlur = () => {
    if (resolvedRef.current) { resolvedRef.current = false; return; }
    if (kind !== 'select') commit(draft);
  };

  return (
    <td className={`${className} is-cell-editing`} data-label={label}>
      {kind === 'select' ? (
        <select
          className="select select-sm cell-input"
          autoFocus
          value={draft}
          disabled={saving}
          onChange={(e) => { setDraft(e.target.value); commit(e.target.value); }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        >
          <option value="">{selectPlaceholder}</option>
          {selectOptions.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={kind === 'date' ? 'date' : 'text'}
          className="input cell-input"
          autoFocus
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      )}
    </td>
  );
}

// Due dashboard's own results table — richer than the shared DueTable used
// by the Overdue tab: adds Issue, Checklist date and Action as full columns
// and moves F1/F26 to the end. Deliberately not shared with Overdue, which
// keeps its slimmer column set via DueTable.jsx.
//
// Editing is Excel-style and inline, desktop only (the phone card list
// never renders this table at all): Assigned to (FER/FORM 3 rows only, per
// MANUAL_ASSIGN_TYPES), Status notes, Issue, Checklist date and Action are
// double-click-to-edit cells; the Status dropdown for a canSetStatus row
// (a HEARING past its date with no WS filed) sits next to the badge instead,
// always visible rather than gated behind a double-click, since it only ever
// appears on that one narrow case. Every other column is plain text.
function DueDashboardTable({ dues, assignees, onSaveEntry, onError, onSelectDue }) {
  const [editingCell, setEditingCell] = useState(null); // { key, field } | null
  const [savingCell, setSavingCell] = useState(null); // "key:field" | null

  const commitField = async (due, field, value) => {
    const cellKey = `${keyOf(due)}:${field}`;
    setSavingCell(cellKey);
    try {
      const entry = await saveDueFields(due, { [field]: value });
      onSaveEntry(entry);
      setEditingCell(null);
    } catch (err) {
      onError(isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message);
    } finally {
      setSavingCell(null);
    }
  };

  return (
    <div className="table-wrap">
      <table className="due-dashboard-table">
        <thead>
          <tr>
            <th className="col-code">Code</th>
            <th className="col-appno">Application no.</th>
            <th className="col-title">Title</th>
            <th className="col-applicant">Applicant</th>
            <th className="col-type">Due type</th>
            <th className="col-date">Deadline</th>
            <th className="col-postdate">Can be postdated upto</th>
            <th className="col-status">Status</th>
            <th className="col-owner">Assigned to</th>
            <th className="col-notes">Status notes</th>
            <th className="col-issue">Issue</th>
            <th className="col-checklist">Checklist date</th>
            <th className="col-action">Action</th>
            <th className="col-forms section-start">F1 / F26</th>
          </tr>
        </thead>
        <tbody>
          {dues.map((d) => {
            const k = keyOf(d);
            const m = d.manual || {};
            const canAssign = MANUAL_ASSIGN_TYPES.includes(d.dueType);

            const isEditingField = (field) => editingCell?.key === k && editingCell?.field === field;
            const isSavingField = (field) => savingCell === `${k}:${field}`;
            const startEdit = (field) => () => {
              if (savingCell) return; // one save in flight at a time
              setEditingCell({ key: k, field });
            };
            const cancelEdit = () => setEditingCell(null);
            const commit = (field) => (value) => commitField(d, field, value);

            return (
              <tr key={k} className={d.status === 'overdue' ? 'is-overdue' : ''}>
                <td className="col-code">
                  <div className="code-cell-stack">
                    <button className="link-btn" onClick={() => onSelectDue(d)}>
                      {d.code}
                    </button>
                    {d.isAbandoned && <span className="status-pill is-abandoned">Abandoned</span>}
                  </div>
                </td>
                <td className="col-appno" data-label="Application no."><AppNoValue value={d.applicationNumber} /></td>
                <TruncatedCell className="cell-title col-title" text={d.title} label="Title" />
                <TruncatedCell className="col-applicant" text={d.applicantName} label="Applicant" />
                <td
                  className="col-type"
                  data-label="Due type"
                  title={d.dueType === 'WRITTEN SUBMISSION' ? d.dueType : undefined}
                >
                  {shortDueType(d.dueType)}
                </td>
                <td className="col-date" data-label="Deadline">{formatDate(d.deadline)}</td>
                <td className="col-postdate" data-label="Can be postdated upto">{d.postDateMonths || '—'}</td>

                <td className="col-status" data-label="Status">
                  <div className="status-cell">
                    <StatusBadge status={d.status} />
                    {d.canSetStatus && (
                      <select
                        className="select select-sm status-inline-select"
                        value={m.status || ''}
                        disabled={isSavingField('status')}
                        onChange={(e) => commitField(d, 'status', e.target.value)}
                        aria-label={`Set status for ${d.code}`}
                      >
                        <option value="">— not set —</option>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </td>

                {canAssign ? (
                  <EditableCell
                    className="col-owner" label="Assigned to" kind="select"
                    value={m.assigned_to || ''}
                    renderDisplay={(v) => <Assignee name={v} />}
                    editing={isEditingField('assigned_to')}
                    saving={isSavingField('assigned_to')}
                    onStartEdit={startEdit('assigned_to')}
                    onCommit={commit('assigned_to')}
                    onCancel={cancelEdit}
                    selectOptions={assignees}
                    selectPlaceholder="— not assigned —"
                  />
                ) : (
                  <td className="col-owner" data-label="Assigned to"><Assignee name={d.assignedTo} /></td>
                )}

                <EditableCell
                  className="col-notes" label="Status notes"
                  value={m.status_notes || ''}
                  editing={isEditingField('status_notes')}
                  saving={isSavingField('status_notes')}
                  onStartEdit={startEdit('status_notes')}
                  onCommit={commit('status_notes')}
                  onCancel={cancelEdit}
                />

                <EditableCell
                  className="col-issue" label="Issue"
                  value={m.issue || ''}
                  editing={isEditingField('issue')}
                  saving={isSavingField('issue')}
                  onStartEdit={startEdit('issue')}
                  onCommit={commit('issue')}
                  onCancel={cancelEdit}
                />

                <EditableCell
                  className="col-checklist" label="Checklist date" kind="date"
                  value={m.checklist_sent_date || ''}
                  display={formatDate(m.checklist_sent_date) || ''}
                  editing={isEditingField('checklist_sent_date')}
                  saving={isSavingField('checklist_sent_date')}
                  onStartEdit={startEdit('checklist_sent_date')}
                  onCommit={commit('checklist_sent_date')}
                  onCancel={cancelEdit}
                />

                <EditableCell
                  className="col-action" label="Action"
                  value={m.suggested_action || ''}
                  editing={isEditingField('suggested_action')}
                  saving={isSavingField('suggested_action')}
                  onStartEdit={startEdit('suggested_action')}
                  onCommit={commit('suggested_action')}
                  onCancel={cancelEdit}
                />

                <td className="col-forms section-start" data-label="F1 / F26">
                  <FormStatusCell f1={d.f1Status} f26={d.f26Status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DueDashboardTable;
