import { useState } from 'react';
import Assignee from './Assignee';
import { apiFetch, API_BASE } from './api';
import { isNetworkError, NETWORK_ERROR_MESSAGE, serverErrorMessage } from './errors';
import { keyOf, formatDate, shortDueType, shortFormStatus } from './dueConstants';
import { AppNoValue } from './CopyButton';

// Due types where a senior manually picks who it goes to.
// For PS-CS, FORM 1 and FORM 26 the drafter comes from the LR Sheet.
// HEARING, RENEWAL and WRITTEN SUBMISSION are fixed to one person each
// (set server-side) and are not editable here.
// Exported: the Due dashboard's inline editor (DueDashboardTable) uses the
// same rule to decide which rows get an editable Assigned to cell.
export const MANUAL_ASSIGN_TYPES = ['FER', 'FORM 3'];

// Status is set by hand only for a HEARING whose date has passed with no WS filed.
// The backend decides this and sends `canSetStatus` on each due.
// Exported: shared with the Due dashboard's inline Status dropdown.
export const STATUS_OPTIONS = ['completed', 'overdue'];

// One manual field of one due, saved as a full-row upsert (POST /api/due-entries
// replaces every manual column, it doesn't patch). `overrides` carries the field(s)
// actually being changed; everything else is resent from the due's current manual
// values so a save never wipes data the caller isn't touching. Used by EditRow's
// own handleSave below and by the Due dashboard's inline per-cell editor
// (DueDashboardTable), which calls this once per field instead of once per row.
export async function saveDueFields(due, overrides) {
  const m = due.manual || {};
  const canAssign = MANUAL_ASSIGN_TYPES.includes(due.dueType);
  const res = await apiFetch(`${API_BASE}/api/due-entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: due.code,
      type_of_due: due.dueType,
      due_date: due.deadline,
      status: due.canSetStatus ? (overrides.status ?? m.status ?? null) : null,
      assigned_to: canAssign ? (overrides.assigned_to ?? m.assigned_to ?? null) : null,
      status_notes: overrides.status_notes ?? m.status_notes ?? null,
      suggested_action: overrides.suggested_action ?? m.suggested_action ?? null,
      issue: overrides.issue ?? m.issue ?? null,
      checklist_sent_date: overrides.checklist_sent_date ?? m.checklist_sent_date ?? null,
    }),
  });
  if (!res.ok) throw new Error(await serverErrorMessage(res, 'Save failed'));
  const data = await res.json();
  return data.entry;
}

export function FormStatusCell({ f1, f26 }) {
  const a = shortFormStatus(f1);
  const b = shortFormStatus(f26);
  if (!a && !b) return <span className="form-status-none">—</span>;
  return (
    <div className="form-status">
      {a && (
        <div className={`form-status-line tone-${a.tone}`}>
          <span className="form-status-key">F1</span> {a.text}
        </div>
      )}
      {b && (
        <div className={`form-status-line tone-${b.tone}`}>
          <span className="form-status-key">F26</span> {b.text}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function SummaryCard({ value, label, active, onClick }) {
  if (!onClick) {
    return (
      <div className="summary-card is-static">
        <div className="summary-number">{value}</div>
        <div className="summary-label">{label}</div>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`summary-card ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="summary-number">{value}</div>
      <div className="summary-label">{label}</div>
    </button>
  );
}

export function EditRow({ due, assignees, onSave, onError, onCancel, colSpan = 11 }) {
  const m = due.manual || {};
  const [form, setForm] = useState({
    status: m.status || '',
    assigned_to: m.assigned_to || '',
    status_notes: m.status_notes || '',
    suggested_action: m.suggested_action || '',
    issue: m.issue || '',
    checklist_sent_date: m.checklist_sent_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canAssign = MANUAL_ASSIGN_TYPES.includes(due.dueType);
  const canSetStatus = due.canSetStatus === true;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/due-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: due.code,
          type_of_due: due.dueType,
          due_date: due.deadline,
          status: canSetStatus ? form.status : null,
          assigned_to: canAssign ? form.assigned_to : null,
          status_notes: form.status_notes,
          suggested_action: form.suggested_action,
          issue: form.issue,
          checklist_sent_date: form.checklist_sent_date || null,
        }),
      });
      if (!res.ok) throw new Error(await serverErrorMessage(res, 'Save failed'));
      const data = await res.json();
      onSave(data.entry);
    } catch (err) {
      const message = isNetworkError(err) ? NETWORK_ERROR_MESSAGE : err.message;
      setError(message);
      setSaving(false);
      onError?.(message);
    }
  };

  return (
    <tr className="edit-row">
      <td colSpan={colSpan}>
        <div className="edit-panel">
          <div className="edit-head">
            Editing <strong>{due.code}</strong> — {due.dueType} due {formatDate(due.deadline)}
          </div>

          <div className="edit-grid">
            {canSetStatus && (
              <div className="field">
                <label className="field-label">Status</label>
                <select className="select" value={form.status} onChange={set('status')}>
                  <option value="">— not set —</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {canAssign && (
              <div className="field">
                <label className="field-label">Assigned to</label>
                <select className="select" value={form.assigned_to} onChange={set('assigned_to')}>
                  <option value="">— not assigned —</option>
                  {assignees.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label className="field-label">Checklist sent date</label>
              <input
                type="date"
                className="input input-sm"
                value={form.checklist_sent_date}
                onChange={set('checklist_sent_date')}
              />
            </div>
          </div>

          <div className="edit-grid edit-grid-wide">
            <div className="field">
              <label className="field-label">Issue</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="What is blocking this due?"
                value={form.issue}
                onChange={set('issue')}
              />
            </div>

            <div className="field">
              <label className="field-label">Suggested action</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="How to resolve it"
                value={form.suggested_action}
                onChange={set('suggested_action')}
              />
            </div>

            <div className="field">
              <label className="field-label">Status notes</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Current progress"
                value={form.status_notes}
                onChange={set('status_notes')}
              />
            </div>
          </div>

          {error && <p className="edit-error">{error}</p>}

          <div className="edit-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// Overdue tab's results table — view-only (no inline editing), with
// "Can be postdated upto" in place of Status notes/Edit.
function DueTable({ dues, onSelectDue }) {
  return (
    <div className="table-wrap">
      <table className="due-table">
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
            <th className="col-forms">F1 / F26</th>
          </tr>
        </thead>
        <tbody>
          {dues.map((d) => {
            const k = keyOf(d);
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
                <td className="cell-title col-title" data-label="Title">{d.title}</td>
                <td className="col-applicant" data-label="Applicant">{d.applicantName}</td>
                <td
                  className="col-type"
                  data-label="Due type"
                  title={d.dueType === 'WRITTEN SUBMISSION' ? d.dueType : undefined}
                >
                  {shortDueType(d.dueType)}
                </td>
                <td className="col-date" data-label="Deadline">{formatDate(d.deadline)}</td>
                <td className="col-postdate" data-label="Can be postdated upto">{d.postDateMonths || '—'}</td>
                <td className="col-status" data-label="Status"><StatusBadge status={d.status} /></td>
                <td className="col-owner" data-label="Assigned to"><Assignee name={d.assignedTo} /></td>
                <td className="col-forms" data-label="F1 / F26">
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

export default DueTable;
