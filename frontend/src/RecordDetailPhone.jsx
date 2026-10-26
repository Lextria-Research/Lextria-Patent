import { PhoneBackButton, PhoneSection } from './PhoneDetailParts';
import { AppNoValue } from './CopyButton';

// Phone layout of the LR record page: the same `detail` object (every column
// of the sheet row) grouped into collapsible sections. Field order inside a
// section is the sheet's own order. A column that is not listed here (e.g. one
// added to the sheet later) lands in "Other", so no field can go missing.
const SECTIONS = [
  {
    id: 'basic',
    title: 'Basic info',
    keys: [
      'Code', 'Title', 'Application Number', 'Communication Status', 'Assigned to',
      'Color Code Status', 'STATUS', 'Filed BY',
    ],
  },
  {
    id: 'contact',
    title: 'Applicant and contact',
    keys: [
      'Applicant Name', 'Applicant address', 'Inventor Name', 'Inventor address',
      'INVENTOR Institution', 'Inventor Designation', 'Inventor Email', 'Phone No.',
    ],
  },
  {
    id: 'dates',
    title: 'Dates',
    keys: [
      'date of filing (PS)', 'Post-Dated Date', 'POST DATE ALLOWED', 'Remaining Post-Date Months',
      'CS DEADLINE', 'Date of filing (CS)', 'APPLICATION FILING RECEIPT', 'Date of Publication',
      'Helper(Publication', 'Publication number', 'Date of FER Notice', 'FER Reply Deadline',
      'Date of filing FER Reply', 'Date of Hearing notice', 'Date of hearing', 'WS Deadline',
      'Date of filing WS', 'Date of Grant', 'Date of refusal', 'Date of Renewal',
      'Date of Next Renewal',
    ],
  },
  {
    id: 'forms',
    title: 'Forms',
    keys: [
      'Form-1 deadline', 'Form-1 date of filing', 'Form 26 Deadline', 'Form-26 date of filing',
      'Form-9 date of filing', 'Form 13 date of filing', 'Form 13 Particulars',
      'Form-18/18A date of filing', 'FORM 3 date of filing', 'FORM 3 deadline',
      'Form 27 Date of filing', 'F1 Delayed by', 'F26 Delayed by', 'Form 6- Date of Filing',
      'Form 4 FER Date of filing', 'Form 4 for WS Date of filing', 'Form 4 for Form 3',
      'Form 8 Date of filing', 'Form 8A Date of filling', 'Form 24 Date of filing',
      'Form 30 respose to office action', 'Form 30 Withdrawal', 'Petition under 137',
      'Petition under 138', 'Form 30 hearing Intrest',
    ],
  },
  {
    id: 'other',
    title: 'Other',
    keys: ['Miscellaneous', 'Additional Comments', 'Queries', 'Query Status'],
  },
];

// The sheet's header cells can carry stray line breaks / trailing spaces
// (e.g. "\r\nApplicant address\r\n", "Assigned to "), so match on a
// whitespace-normalised key. The label shown is still the original text.
const norm = (key) => key.replace(/\s+/g, ' ').trim();

const SECTION_OF = new Map(
  SECTIONS.flatMap((s) => s.keys.map((k) => [k, s.id]))
);

function groupFields(detail) {
  const groups = Object.fromEntries(SECTIONS.map((s) => [s.id, []]));
  for (const [key, value] of Object.entries(detail)) {
    groups[SECTION_OF.get(norm(key)) || 'other'].push([key, value]);
  }
  return SECTIONS.map((s) => ({ ...s, fields: groups[s.id] }));
}

const isEmpty = (value) => value === undefined || value === null || String(value).trim() === '';

function RecordDetailPhone({ code, detail, loading, error, mahe, onBack }) {
  const status = detail && !isEmpty(detail['STATUS']) ? String(detail['STATUS']) : '';
  const title = detail && !isEmpty(detail['Title']) ? String(detail['Title']) : '';

  return (
    <div className="rec-phone">
      <PhoneBackButton label="LR records" onBack={onBack} />

      <h2 className="rec-code">{code}</h2>
      {title && <p className="rec-title">{title}</p>}
      {(mahe || status) && (
        <div className="rec-badges">
          {mahe && <span className={`mahe-pill ${mahe === 'MAHE' ? 'is-mahe' : ''}`}>{mahe}</span>}
          {status && <span className="status-pill">{status}</span>}
        </div>
      )}

      {loading && <div className="state"><p>Loading record…</p></div>}
      {error && <div className="error">{error}</div>}

      {/* All sections start collapsed — the person taps open whichever they need. */}
      {detail && groupFields(detail).map((s) => (
        <PhoneSection
          key={s.id}
          title={s.title}
          fields={s.fields.map(([key, value]) => [
            key,
            norm(key) === 'Application Number'
              ? <AppNoValue value={isEmpty(value) ? '' : String(value)} empty="-" />
              : (isEmpty(value) ? '-' : String(value)),
          ])}
        />
      ))}
    </div>
  );
}

export default RecordDetailPhone;
