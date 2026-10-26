import { PhoneBackButton, PhoneSection } from './PhoneDetailParts';
import { formatDate, formatDateOrRaw, renewalLabel, isBlankValue, rfeDeadlineText, verdictClass } from './dueConstants';
import { AppNoValue } from './CopyButton';

// The sheet's own values can be "" — an empty value reads "-".
const show = (v) => (v === undefined || v === null || String(v).trim() === '' ? '-' : String(v));

const maheClass = (p) => `mahe-pill ${p.mahe === 'MAHE' ? 'is-mahe' : ''}`;

// One entry per patent tab that has a phone detail page: the back label, the
// header pills, and the sections. Each section lists the same values, with the
// same labels, as that tab's desktop detail page (patentDetailRows in its own
// file). Code and Title of Invention sit in the header, in full; the pills
// repeat some values that are also labelled rows.
const TABS = {
  // Every patent here has a filing date and a classification.
  filed: {
    backLabel: 'Patent filed',
    pills: (p) => {
      const published = p.publicationStatus === 'Published';
      return [
        p.mahe && <span key="mahe" className={maheClass(p)}>{p.mahe}</span>,
        p.classification && <span key="class" className="status-pill">{p.classification}</span>,
        <span key="pub" className={`status-pill ${published ? 'is-published' : ''}`}>
          {published ? `Published ${formatDate(p.dateOfPublication)}`.trim() : 'Not published'}
        </span>,
      ];
    },
    sections: (p) => [
      {
        id: 'filing',
        title: 'Filing details',
        defaultOpen: true,
        fields: [
          ['Name of Inventors', show(p.inventorName)],
          ['MAHE / Non-MAHE', show(p.mahe)],
          ['Institution / Company', show(p.institutionCompany)],
          ['Applicant', show(p.applicantName)],
          ['Patent Application No.', <AppNoValue value={p.applicationNumber} empty="-" />],
          ['D.O.F.', show(formatDate(p.dof))],
          ['Classification', show(p.classification)],
        ],
      },
      {
        id: 'publication',
        title: 'Publication',
        fields: [
          ['Publication status', show(p.publicationStatus)],
          ['Date of publication', show(formatDate(p.dateOfPublication))],
        ],
      },
    ],
  },
  // No abandoned flag or institution in this tab's data, so neither is shown.
  granted: {
    backLabel: 'Granted patents',
    pills: (p) => {
      const renewal = renewalLabel(p);
      return [
        p.mahe && <span key="mahe" className={maheClass(p)}>{p.mahe}</span>,
        renewal && (
          <span key="renewal" className={`status-pill ${renewal.overdue ? 'is-overdue' : ''}`}>{renewal.text}</span>
        ),
      ];
    },
    sections: (p) => [
      {
        id: 'grant',
        title: 'Grant details',
        defaultOpen: true,
        fields: [
          ['Date of grant', show(formatDate(p.dateOfGrant))],
          ['Application number', <AppNoValue value={p.applicationNumber} empty="-" />],
          ['Assigned to', show(p.assignedTo)],
        ],
      },
      {
        id: 'renewal',
        title: 'Renewal',
        fields: [
          ['Renewal date', show(formatDate(p.dateOfRenewal))],
          ['Next renewal', show(formatDate(p.nextRenewal))],
        ],
      },
      {
        id: 'filing',
        title: 'Filing details',
        fields: [
          ['MAHE / Non-MAHE', show(p.mahe)],
          ['Applicant', show(p.applicantName)],
          ['Inventor Name', show(p.inventorName)],
          ['Filing (PS)', show(formatDate(p.dateOfFilingPS))],
          ['Filing (CS)', show(formatDate(p.dateOfFilingCS))],
          ['Publication date', show(formatDate(p.dateOfPublication))],
          ['Publication number', show(p.publicationNumber)],
        ],
      },
    ],
  },
  // Every row here is abandoned, so the badge is part of the header pills (first,
  // before MAHE) and the sheet's full STATUS text follows as its own line.
  abandoned: {
    backLabel: 'Abandoned patents',
    pills: (p) => [
      <span key="abandoned" className="abandoned-badge">Abandoned</span>,
      p.mahe && <span key="mahe" className={maheClass(p)}>{p.mahe}</span>,
    ],
    lead: (p) => (isBlankValue(p.status) ? '' : String(p.status)),
    sections: (p) => [
      {
        id: 'status',
        title: 'Status',
        defaultOpen: true,
        fields: [
          ['Status', show(p.status)],
          ['Assigned to', show(p.assignedTo)],
        ],
      },
      {
        id: 'filing',
        title: 'Filing details',
        fields: [
          ['MAHE / Non-MAHE', show(p.mahe)],
          ['Name of Inventors', show(p.inventorName)],
          ['Applicant', show(p.applicantName)],
          ['Patent Application No.', <AppNoValue value={p.applicationNumber} empty="-" />],
          ['D.O.F.', show(formatDate(p.dof))],
        ],
      },
      {
        id: 'publication',
        title: 'Publication and grant',
        fields: [
          ['Publication date', show(formatDate(p.dateOfPublication))],
          ['Publication number', show(p.publicationNumber)],
          ['Form 9 filed', show(p.form9Filed)],
          ['Form 18 filed', show(p.form18Filed)],
          ['Date of grant', show(formatDate(p.dateOfGrant))],
        ],
      },
    ],
  },
  // F1/F26 delayed or pending: the verdict and the numbers behind it lead the
  // page (header pills + the sheet's STATUS text). The sections hold the same
  // rows, with the same labels, as the desktop detail page.
  f1f26: {
    backLabel: 'F1/F26',
    pills: (p) => [
      <span key="verdict" className={verdictClass(p.verdict)}>{p.verdict}</span>,
      p.form1 && <span key="f1" className="status-pill is-warn">Form 1 {p.form1.status} {p.form1.daysLate}d</span>,
      p.form26 && <span key="f26" className="status-pill is-warn">Form 26 {p.form26.status} {p.form26.daysLate}d</span>,
      <span key="needed" className="status-pill">Days needed {p.daysNeeded}</span>,
      <span key="avail" className="status-pill">
        Days available {p.daysAvailable === null ? 'Unknown' : p.daysAvailable}
      </span>,
    ],
    lead: (p) => (isBlankValue(p.status) ? '' : String(p.status)),
    sections: (p) => [
      {
        id: 'application',
        title: 'Application',
        defaultOpen: true,
        fields: [
          ['Application number', <AppNoValue value={p.applicationNumber} empty="-" />],
          ['Assigned to', show(p.assignedTo)],
          ['STATUS', show(p.status)],
        ],
      },
      {
        id: 'pscs',
        title: 'PS / CS',
        fields: [
          ['PS date of filing', show(formatDateOrRaw(p.psFiled))],
          ['CS deadline', show(formatDateOrRaw(p.csDeadline))],
          ['CS date of filing', show(formatDateOrRaw(p.csFiled))],
        ],
      },
      {
        id: 'form1',
        title: 'Form 1',
        fields: [
          ['Form-1 deadline', show(formatDateOrRaw(p.form1Deadline))],
          ['Form-1 date of filing', show(formatDateOrRaw(p.form1Filed))],
        ],
      },
      {
        id: 'form26',
        title: 'Form 26',
        fields: [
          ['Form 26 deadline', show(formatDateOrRaw(p.form26Deadline))],
          ['Form-26 date of filing', show(formatDateOrRaw(p.form26Filed))],
        ],
      },
      {
        id: 'postdate',
        title: 'Post-dating',
        fields: [['Remaining post-date months', show(p.postDateText)]],
      },
    ],
  },
  // Pending forms and the RFE deadline lead the page. Applicant, inventor and
  // the rest follow, so every desktop detail row is here (Code and Title sit in
  // the header, in full).
  f9f18: {
    backLabel: 'F9/F18 pending',
    pills: (p) => [
      p.f9Status === 'Pending' && <span key="f9" className="status-pill">F9 pending</span>,
      p.f18Status === 'Pending' && <span key="f18" className="status-pill">F18 pending</span>,
      <span key="rfe" className={`status-pill ${p.deadlineLapsed ? 'is-overdue' : ''}`}>
        {p.deadlineLapsed ? `RFE lapsed · ${rfeDeadlineText(p)}` : `RFE deadline ${rfeDeadlineText(p)}`}
      </span>,
    ],
    sections: (p) => [
      {
        id: 'forms',
        title: 'Forms and RFE deadline',
        defaultOpen: true,
        fields: [
          ['F9 status', show(p.f9Status)],
          ['F18 status', show(p.f18Status)],
          ['RFE deadline (Form-18)', show(rfeDeadlineText(p))],
        ],
      },
      {
        id: 'application',
        title: 'Application',
        fields: [
          ['Application number', <AppNoValue value={p.applicationNumber} empty="-" />],
          ['Applicant name', show(p.applicantName)],
          ['Inventor name', show(p.inventorName)],
          ['Assigned to', show(p.assignedTo)],
        ],
      },
      {
        id: 'dates',
        title: 'Filing and publication',
        fields: [
          ['CS filing date', show(formatDateOrRaw(p.csFilingDate))],
          ['Publication date', show(formatDateOrRaw(p.publicationDate))],
        ],
      },
    ],
  },
  published: {
    backLabel: 'Published patents',
    pills: (p) => [
      p.mahe && <span key="mahe" className={maheClass(p)}>{p.mahe}</span>,
      p.classification && <span key="class" className="status-pill">{p.classification}</span>,
    ],
    sections: (p) => [
      {
        id: 'publication',
        title: 'Publication details',
        defaultOpen: true,
        fields: [
          ['Date of publication', show(formatDate(p.dateOfPublication))],
          ['Publication number', show(p.publicationNumber)],
          ['Form 18 filed', show(p.form18Filed)],
        ],
      },
      {
        id: 'filing',
        title: 'Filing details',
        fields: [
          ['Name of Inventors', show(p.inventorName)],
          ['MAHE / Non-MAHE', show(p.mahe)],
          ['Institution / Company', show(p.institutionCompany)],
          ['Applicant', show(p.applicantName)],
          ['Patent Application No.', <AppNoValue value={p.applicationNumber} empty="-" />],
          ['D.O.F.', show(formatDate(p.dof))],
          ['Classification', show(p.classification)],
        ],
      },
    ],
  },
};

// Phone layout of a patent tab's detail page, shared by the tabs (`tab` picks
// the entry above). View only.
function PatentDetailPhone({ tab, patent: p, onBack }) {
  const config = TABS[tab];
  const lead = config.lead ? config.lead(p) : '';
  return (
    <div className="rec-phone">
      <PhoneBackButton label={config.backLabel} onBack={onBack} />

      <h2 className="rec-code">{p.code}</h2>
      {p.title && <p className="rec-title">{p.title}</p>}
      <div className="rec-badges">
        {config.pills(p)}
        {p.isAbandoned && <span className="abandoned-badge">Abandoned</span>}
      </div>
      {lead && <p className="rec-status">{lead}</p>}

      {config.sections(p).map((s) => (
        <PhoneSection key={s.id} title={s.title} fields={s.fields} defaultOpen={s.defaultOpen} />
      ))}
    </div>
  );
}

export default PatentDetailPhone;
