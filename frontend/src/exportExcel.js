import ExcelJS from 'exceljs';
import { formatDate, formatDateOrRaw, shortDueType, shortFormStatus, codePrefix } from './dueConstants';

// Same short-label logic FormStatusCell uses on screen, but as plain text
// for a spreadsheet cell instead of a colored line.
function formStatusText(raw) {
  const s = shortFormStatus(raw);
  return s ? s.text : '';
}

const CODE = { header: 'Code', width: 12, value: (d) => d.code };
const APPNO = { header: 'Application no.', width: 18, value: (d) => d.applicationNumber };
const TITLE = { header: 'Title', width: 45, value: (d) => d.title };
const APPLICANT = { header: 'Applicant', width: 30, value: (d) => d.applicantName };
const DUE_TYPE = { header: 'Due type', width: 14, value: (d) => shortDueType(d.dueType) };
const DEADLINE = { header: 'Deadline', width: 12, value: (d) => formatDate(d.deadline) };
const STATUS = { header: 'Status', width: 12, value: (d) => d.status };
const ASSIGNED_TO = { header: 'Assigned to', width: 16, value: (d) => d.assignedTo || '' };
const F1_STATUS = { header: 'F1 Status', width: 16, value: (d) => formStatusText(d.f1Status) };
const F26_STATUS = { header: 'F26 Status', width: 16, value: (d) => formStatusText(d.f26Status) };
const POSTDATE = { header: 'Can be postdated upto', width: 22, value: (d) => d.postDateMonths || '' };
const STATUS_NOTES = { header: 'Status notes', width: 35, value: (d) => (d.manual ? d.manual.status_notes || '' : '') };
const ISSUE = { header: 'Issue', width: 40, value: (d) => (d.manual ? d.manual.issue || '' : '') };

// Due dashboard export mirrors the due-detail page's field set/labels and
// order, not the on-screen table's — the user asked for these specifically.
const DUE_DATE = { header: 'Due date', width: 12, value: (d) => formatDate(d.deadline) };
const INVENTOR_NAME = { header: 'Inventor Name', width: 30, value: (d) => d.inventorName || '' };
const DEPARTMENT = { header: 'Department', width: 35, value: (d) => d.department || '' };
const INVENTOR_EMAIL = { header: 'Inventor mail ID', width: 28, value: (d) => d.inventorEmail || '' };
const PHONE_NUMBER = { header: 'Phone number', width: 14, value: (d) => d.phoneNumber || '' };
const TYPE_OF_DUE = { header: 'Type of due', width: 14, value: (d) => shortDueType(d.dueType) };
const SUGGESTED_ACTION = { header: 'Suggested action', width: 35, value: (d) => (d.manual ? d.manual.suggested_action || '' : '') };
const CHECKLIST_SENT_DATE = { header: 'Checklist sent date', width: 16, value: (d) => (d.manual ? formatDate(d.manual.checklist_sent_date) : '') };

export const DUE_DASHBOARD_COLUMNS = [
  CODE, APPNO, TITLE, DUE_DATE, APPLICANT, INVENTOR_NAME, DEPARTMENT,
  INVENTOR_EMAIL, PHONE_NUMBER, TYPE_OF_DUE, STATUS, POSTDATE, ASSIGNED_TO,
  STATUS_NOTES, ISSUE, SUGGESTED_ACTION, CHECKLIST_SENT_DATE, F1_STATUS, F26_STATUS,
];

export const OVERDUE_COLUMNS = [
  CODE, APPNO, TITLE, APPLICANT, DUE_TYPE, DEADLINE, POSTDATE, STATUS,
  ASSIGNED_TO, F1_STATUS, F26_STATUS,
];

// Shared across Granted/Published/Patent filed — same MAHE/Non-MAHE split.
const MAHE_COLUMN = { header: 'MAHE / Non-MAHE', width: 14, value: (d) => d.mahe };

// Granted patents export mirrors its own on-screen table exactly.
const FILING_PS = { header: 'Filing (PS)', width: 14, value: (d) => formatDate(d.dateOfFilingPS) };
const FILING_CS = { header: 'Filing (CS)', width: 14, value: (d) => formatDate(d.dateOfFilingCS) };
const PUBLICATION_DATE = { header: 'Publication date', width: 16, value: (d) => formatDate(d.dateOfPublication) };
const PUBLICATION_NO = { header: 'Publication no.', width: 16, value: (d) => d.publicationNumber || '' };
const DATE_OF_GRANT = { header: 'Date of grant', width: 14, value: (d) => formatDate(d.dateOfGrant) };
const RENEWAL_DATE = { header: 'Renewal date', width: 14, value: (d) => formatDate(d.dateOfRenewal) };
const NEXT_RENEWAL = { header: 'Next renewal', width: 14, value: (d) => formatDate(d.nextRenewal) };

export const GRANTED_PATENTS_COLUMNS = [
  CODE, MAHE_COLUMN, APPNO, TITLE, APPLICANT, FILING_PS, FILING_CS, PUBLICATION_DATE,
  PUBLICATION_NO, DATE_OF_GRANT, RENEWAL_DATE, NEXT_RENEWAL, ASSIGNED_TO,
];

// Published patents export matches the on-screen table, plus Inventor Name
// (hidden on screen, included here per the user's request).
const INSTITUTION_COMPANY = { header: 'Institution / Company', width: 35, value: (d) => d.institutionCompany || '' };
const DOF = { header: 'D.O.F.', width: 12, value: (d) => formatDate(d.dof) };
const CLASSIFICATION = { header: 'Classification', width: 18, value: (d) => d.classification || '' };
const FORM_18_FILED = { header: 'Form 18 filed', width: 14, value: (d) => d.form18Filed };
const NAME_OF_INVENTORS = { header: 'Name of Inventors', width: 30, value: (d) => d.inventorName || '' };

export const PUBLISHED_PATENTS_COLUMNS = [
  CODE, NAME_OF_INVENTORS, MAHE_COLUMN, INSTITUTION_COMPANY, TITLE, APPLICANT,
  APPNO, DOF, CLASSIFICATION, PUBLICATION_DATE, PUBLICATION_NO, FORM_18_FILED,
];

// Patent filed export matches its own on-screen table, plus Inventor Name
// (hidden on screen, included here like Published patents).
const PUBLICATION_STATUS = { header: 'Publication Status', width: 16, value: (d) => d.publicationStatus };

export const PATENT_FILED_COLUMNS = [
  CODE, NAME_OF_INVENTORS, MAHE_COLUMN, INSTITUTION_COMPANY, TITLE, APPLICANT,
  APPNO, DOF, CLASSIFICATION, PUBLICATION_STATUS, PUBLICATION_DATE,
];

// Abandoned patents: the on-screen columns plus the fields too sparse or
// too long for the table, split across MAHE / Non-MAHE sheets (see
// exportAbandonedPatentsToExcel).
//
// Deliberately absent: Code type (the Code's own prefix), Institution
// (blank on well over a third of these rows), Date of grant (no abandoned
// row has one), and Classification / Filing (PS) / Filing (CS). Those last
// three restate what Status and D.O.F. already say — an abandoned
// application has a PS date or a CS date, virtually never both, so D.O.F.
// is that one date and Status names which kind it was.
const FORM_9_FILED = { header: 'Form 9 filed', width: 12, value: (d) => d.form9Filed };
const LR_STATUS = { header: 'Status', width: 34, value: (d) => d.status || '' };

export const ABANDONED_PATENTS_COLUMNS = [
  CODE, MAHE_COLUMN, NAME_OF_INVENTORS, TITLE, APPLICANT, APPNO, LR_STATUS,
  DOF, PUBLICATION_DATE, PUBLICATION_NO, FORM_9_FILED, FORM_18_FILED, ASSIGNED_TO,
];

// F1/F26 delayed or pending, ordered for acting on it: who, then the verdict
// and the days behind it, then each form's issue followed by its dates, and
// the STATUS / PS / CS background last. Each form's status and days late are
// split into their own cells so they sort/filter in Excel.
const formIssue = (form, field) => (form ? form[field] : '');

export const F1_F26_DELAYED_COLUMNS = [
  CODE, APPNO, ASSIGNED_TO,
  { header: 'Verdict', width: 14, value: (d) => d.verdict },
  { header: 'Days needed', width: 13, value: (d) => d.daysNeeded },
  { header: 'Days available', width: 14, value: (d) => (d.daysAvailable === null ? 'Unknown' : d.daysAvailable) },
  { header: 'Form 1', width: 12, value: (d) => formIssue(d.form1, 'status') },
  { header: 'Form 1 days late', width: 16, value: (d) => formIssue(d.form1, 'daysLate') },
  { header: 'Form 1 deadline', width: 15, value: (d) => formatDateOrRaw(d.form1Deadline) },
  { header: 'Form 1 filing date', width: 17, value: (d) => formatDateOrRaw(d.form1Filed) },
  { header: 'Form 26', width: 12, value: (d) => formIssue(d.form26, 'status') },
  { header: 'Form 26 days late', width: 17, value: (d) => formIssue(d.form26, 'daysLate') },
  { header: 'Form 26 deadline', width: 16, value: (d) => formatDateOrRaw(d.form26Deadline) },
  { header: 'Form 26 filing date', width: 18, value: (d) => formatDateOrRaw(d.form26Filed) },
  { header: 'STATUS', width: 34, value: (d) => d.status || '' },
  { header: 'PS filing date', width: 14, value: (d) => formatDateOrRaw(d.psFiled) },
  { header: 'CS deadline', width: 14, value: (d) => formatDateOrRaw(d.csDeadline) },
  { header: 'CS filing date', width: 14, value: (d) => formatDateOrRaw(d.csFiled) },
];

// Header row and Code column stay put while scrolling the wide F1/F26 sheet.
export const F1_F26_SHEET_OPTIONS = { freezeFirstColumn: true };

// LR records: rows are the raw sheet rows keyed by the sheet's own headers,
// which can carry stray line breaks / trailing spaces ("Assigned to "), so a
// field is found by whitespace-normalised header, like RecordDetailPhone does.
// Dates are shown as the sheet has them (ISO ones reformatted to dd/mm/yyyy).
// Deliberately absent: addresses and contact details, the per-form filing
// dates, FER / hearing / WS / refusal detail and the free-text columns — the
// 75-column row is too wide to read, and the other tabs cover those.
const normHeader = (key) => key.replace(/\s+/g, ' ').trim().toLowerCase();

function sheetField(record, header) {
  const wanted = normHeader(header);
  const key = Object.keys(record).find((k) => normHeader(k) === wanted);
  const value = key === undefined ? '' : record[key];
  return value === null || value === undefined ? '' : String(value).trim();
}

const lrText = (header) => (r) => sheetField(r, header);
const lrDate = (header) => (r) => formatDateOrRaw(sheetField(r, header));

export const LR_RECORDS_COLUMNS = [
  { header: 'Code', width: 12, value: lrText('Code') },
  MAHE_COLUMN,
  { header: 'Application no.', width: 18, value: lrText('Application Number') },
  { header: 'Title', width: 45, value: lrText('Title') },
  { header: 'Applicant', width: 30, value: lrText('Applicant Name') },
  { header: 'Inventor Name', width: 30, value: lrText('Inventor Name') },
  { header: 'Institution', width: 30, value: lrText('INVENTOR Institution') },
  { header: 'Assigned to', width: 16, value: lrText('Assigned to') },
  { header: 'Status', width: 34, value: lrText('STATUS') },
  { header: 'Filing (PS)', width: 14, value: lrDate('date of filing (PS)') },
  { header: 'Filing (CS)', width: 14, value: lrDate('Date of filing (CS)') },
  { header: 'Publication date', width: 16, value: lrDate('Date of Publication') },
  { header: 'Publication no.', width: 16, value: lrText('Publication number') },
  { header: 'Date of grant', width: 14, value: lrDate('Date of Grant') },
  { header: 'Next renewal', width: 14, value: lrDate('Date of Next Renewal') },
];

const HEADER_FILL = 'FF3A86FF'; // matches the app's --accent blue
const LAPSED_FILL = 'FFFFC7CE'; // soft red — flags a lapsed RFE deadline

// Published/Patent filed exports keep abandoned rows but shade their Code
// cell, the spreadsheet equivalent of the tinted row on screen.
export const ABANDONED_CODE_SHADING = { shadeHeader: 'Code', shadeWhen: (d) => d.isAbandoned };

// Excel column widths count characters of the default font, but the sheets
// use Bookman Old Style, which is noticeably wider — so a hard-coded width
// that "looks right" clips bold headers and wraps dates onto two lines.
// These factors scale the character count up to what Bookman actually needs.
const BODY_CHAR_FACTOR = 1.3;
const HEADER_CHAR_FACTOR = 1.45; // bold, and capitals run wider still
const WIDTH_PADDING = 3;
// Values up to this long are treated as "short" (dates, codes, statuses)
// and must never wrap. Longer ones (titles, names) are meant to wrap inside
// the column's configured width.
const SHORT_VALUE_MAX = 22;

function fitWidth(column, rows) {
  const headerFit = column.header.length * HEADER_CHAR_FACTOR + WIDTH_PADDING;
  let longestShort = 0;
  rows.forEach((d) => {
    const v = column.value(d);
    if (v === null || v === undefined) return;
    const len = String(v).length;
    if (len <= SHORT_VALUE_MAX && len > longestShort) longestShort = len;
  });
  const bodyFit = longestShort * BODY_CHAR_FACTOR + WIDTH_PADDING;
  return Math.ceil(Math.max(column.width, headerFit, bodyFit));
}

// Builds one styled worksheet — same header/row formatting regardless of
// how many sheets end up in the workbook. `shadeHeader`, when given, marks
// one column for a distinct red fill on rows where `shadeWhen(d)` is true
// (used for RFE deadline cells that have already lapsed).
function writeWorksheet(workbook, sheetName, columns, rows, { shadeHeader, shadeWhen, freezeFirstColumn } = {}) {
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((c) => ({ header: c.header, key: c.header, width: fitWidth(c, rows) }));

  rows.forEach((d) => {
    const row = {};
    columns.forEach((c) => { row[c.header] = c.value(d); });
    const excelRow = worksheet.addRow(row);
    excelRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Bookman Old Style', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      if (shadeHeader && columns[colNumber - 1].header === shadeHeader && shadeWhen(d)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LAPSED_FILL } };
      }
    });
  });

  const headerRow = worksheet.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Bookman Old Style', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  worksheet.views = [{ state: 'frozen', ySplit: 1, xSplit: freezeFirstColumn ? 1 : 0 }];
}

async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportDuesToExcel(dues, columns, filename, shading) {
  const workbook = new ExcelJS.Workbook();
  writeWorksheet(workbook, 'Sheet1', columns, dues, shading);
  await downloadWorkbook(workbook, filename);
}

// Excel sheet names: max 31 chars, can't contain : \ / ? * [ ]. Code
// prefixes are always short and alphanumeric, but this guards regardless.
function safeSheetName(name) {
  return name.replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Sheet';
}

// Patent filed's export splits into one sheet per Code type (prefix),
// alphabetically — same per-sheet styling as the single-sheet export.
export async function exportPatentFiledToExcel(patents, columns, filename, shading) {
  const groups = new Map();
  patents.forEach((p) => {
    const prefix = codePrefix(p.code) || 'Other';
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(p);
  });

  const workbook = new ExcelJS.Workbook();
  [...groups.keys()].sort().forEach((prefix) => {
    writeWorksheet(workbook, safeSheetName(prefix), columns, groups.get(prefix), shading);
  });

  await downloadWorkbook(workbook, filename);
}

// Abandoned patents' export splits into one sheet per MAHE classification.
// Sheets with no rows (e.g. after filtering to MAHE) are left out, and an
// "Unclassified" sheet only appears if such rows exist, so nothing is
// silently dropped.
export async function exportAbandonedPatentsToExcel(patents, columns, filename) {
  const workbook = new ExcelJS.Workbook();
  ['MAHE', 'Non-MAHE', 'Unclassified'].forEach((group) => {
    const rows = patents.filter((p) => p.mahe === group);
    if (rows.length > 0) writeWorksheet(workbook, group, columns, rows);
  });

  await downloadWorkbook(workbook, filename);
}

// F1/F26 delayed or pending, with the "All" card selected: one sheet per
// verdict, in the table's own order. Unlike the Abandoned export, the two
// sheets are always created — header-only if a group is empty (e.g. a search
// that only matches fixable codes). A third "Unknown" sheet appears only if
// such rows exist, so a code with an unrecognised post-date value can't be
// silently dropped from the file.
export async function exportF1F26DelayedToExcel(patents, columns, filename) {
  const workbook = new ExcelJS.Workbook();
  writeWorksheet(workbook, 'Can be fixed', columns, patents.filter((p) => p.verdict === 'Can be fixed'), F1_F26_SHEET_OPTIONS);
  writeWorksheet(workbook, 'Cannot', columns, patents.filter((p) => p.verdict === 'Cannot'), F1_F26_SHEET_OPTIONS);

  const unknown = patents.filter((p) => p.verdict === 'Unknown');
  if (unknown.length > 0) writeWorksheet(workbook, 'Unknown', columns, unknown, F1_F26_SHEET_OPTIONS);

  await downloadWorkbook(workbook, filename);
}

const RFE_DEADLINE_HEADER ='RFE Deadline (Form-18)';

export const F9_F18_BUCKET_COLUMNS = [
  CODE, APPNO,
  { header: 'Title', width: 40, value: (d) => d.title },
  { header: 'Applicant Name', width: 30, value: (d) => d.applicantName },
  { header: 'Inventor Name', width: 30, value: (d) => d.inventorName },
  { header: 'Assigned To', width: 16, value: (d) => d.assignedTo },
  { header: 'CS Filing Date', width: 14, value: (d) => formatDateOrRaw(d.csFilingDate) },
  { header: 'Publication Date', width: 16, value: (d) => formatDateOrRaw(d.publicationDate) },
  { header: 'F9 Status', width: 22, value: (d) => d.f9Status },
  { header: 'F18 Status', width: 12, value: (d) => d.f18Status },
  { header: RFE_DEADLINE_HEADER, width: 18, value: (d) => (d.rfeDeadline ? formatDate(d.rfeDeadline) : 'Unknown') },
];

const F9_F18_DUPLICATE_COLUMNS = [
  APPNO,
  { header: 'Codes', width: 30, value: (d) => d.codes.join(', ') },
];

const F9_F18_CONTRADICTION_COLUMNS = [
  CODE, APPNO,
  { header: 'STATUS', width: 30, value: (d) => d.status },
  { header: 'F9 Status', width: 22, value: (d) => d.f9Status },
  { header: 'F18 Status', width: 12, value: (d) => d.f18Status },
];

const F9_F18_UNCLEAR_COLUMNS = [
  CODE, APPNO,
  { header: 'Field', width: 20, value: (d) => d.field },
  { header: 'Raw value', width: 30, value: (d) => d.raw },
];

const F9_F18_BLANK_CODE_COLUMNS = [
  { header: 'Row (DATA sheet)', width: 16, value: (d) => d.rowNumber },
  APPNO,
];

// One sheet per bucket/integrity list from GET /api/f9-f18-check. The RFE
// deadline column gets its lapsed shading independently on each of the
// three bucket sheets — the other sheets don't carry a deadline column at
// all, so there's nothing to shade there.
export async function exportF9F18CheckToExcel(report, filename) {
  const workbook = new ExcelJS.Workbook();
  const shading = { shadeHeader: RFE_DEADLINE_HEADER, shadeWhen: (d) => d.deadlineLapsed };

  writeWorksheet(workbook, 'Both F9 and F18 pending', F9_F18_BUCKET_COLUMNS, report.bothPending, shading);
  writeWorksheet(workbook, 'F9 pending only', F9_F18_BUCKET_COLUMNS, report.f9PendingOnly, shading);
  writeWorksheet(workbook, 'F18 pending only', F9_F18_BUCKET_COLUMNS, report.f18PendingOnly, shading);
  writeWorksheet(workbook, 'Duplicate app numbers', F9_F18_DUPLICATE_COLUMNS, report.duplicateApplicationNumbers);
  writeWorksheet(workbook, 'Status contradictions', F9_F18_CONTRADICTION_COLUMNS, report.statusContradictions);
  writeWorksheet(workbook, 'Unclear rows', F9_F18_UNCLEAR_COLUMNS, report.unclear);
  writeWorksheet(workbook, 'Blank code rows', F9_F18_BLANK_CODE_COLUMNS, report.blankCode);

  await downloadWorkbook(workbook, filename);
}
