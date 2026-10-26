import { PhoneBackButton, PhoneSection } from './PhoneDetailParts';
import { StatusBadge } from './DueTable';
import { formatDate, shortFormStatus, overdueLabel } from './dueConstants';
import { AppNoValue } from './CopyButton';

// The sheet's own values can be "" or a lone "-"; an empty value reads "-".
const show = (v) => (v === undefined || v === null || String(v).trim() === '' ? '-' : String(v));

// A form's status in the same short wording (and colour) as the F1 / F26
// column of the desktop table.
function formValue(raw) {
  const s = shortFormStatus(raw);
  return s ? <span className={`form-status-line tone-${s.tone}`}>{s.text}</span> : '-';
}

// Phone layout of the Due detail page: the same `due` and `extra` (the
// /api/due-detail fields) that the desktop page lists, with the desktop's own
// labels and values, grouped into collapsible sections. View only.
// Code, Type of due, Title and Status sit in the header instead of a row.
// The two form rows are the only addition: the desktop page doesn't list them.
function DueDetailPhone({ due, extra, loading, error, backLabel, onBack }) {
  const m = due.manual || {};
  const ex = extra || {};
  const overdue = overdueLabel(due);

  const sections = [
    {
      id: 'due',
      title: 'Due details',
      defaultOpen: true,
      fields: [
        ['Due date', show(formatDate(due.deadline))],
        ['Can be postdated upto', show(ex.postDateMonths)],
        ['Assigned to', show(due.assignedTo)],
        ['Application number', <AppNoValue value={due.applicationNumber} empty="-" />],
        ['Applicant', show(ex.applicantName)],
      ],
    },
    {
      id: 'contact',
      title: 'Inventor and contact',
      fields: [
        ['Inventor Name', show(ex.inventorName)],
        ['Department', show(ex.department)],
        ['Inventor mail ID', show(ex.inventorEmail)],
        ['Phone number', show(ex.phoneNumber)],
      ],
    },
    {
      id: 'notes',
      title: 'Status notes and actions',
      fields: [
        ['Status notes', show(m.status_notes)],
        ['Issue', show(m.issue)],
        ['Suggested action', show(m.suggested_action)],
        ['Checklist sent date', show(formatDate(m.checklist_sent_date))],
      ],
    },
    {
      id: 'forms',
      title: 'Form 1 and Form 26',
      fields: [
        ['Form 1 status', formValue(due.f1Status)],
        ['Form 26 status', formValue(due.f26Status)],
      ],
    },
  ];

  return (
    <div className="rec-phone">
      <PhoneBackButton label={backLabel} onBack={onBack} />

      <div className="due-detail-top">
        <h2 className="rec-code">{due.code}</h2>
        <span className="due-type-pill">{due.dueType}</span>
      </div>
      {due.title && <p className="rec-title">{due.title}</p>}
      <div className="rec-badges">
        <StatusBadge status={due.status} />
        {overdue && <span className="due-deadline is-overdue">{overdue}</span>}
      </div>

      {loading && <p className="refreshing">Loading details…</p>}
      {error && <div className="error">{error}</div>}

      {sections.map((s) => (
        <PhoneSection key={s.id} title={s.title} fields={s.fields} defaultOpen={s.defaultOpen} />
      ))}
    </div>
  );
}

export default DueDetailPhone;
