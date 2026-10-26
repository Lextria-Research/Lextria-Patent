// Values that mean "no data" even though the cell isn't empty
const PLACEHOLDERS = ['', 'na', 'n/a', '-', '--', 'nil', 'none'];

// Formula errors that appear in LR cells
const FORMULA_ERRORS = ['#VALUE!', '#REF!', '#N/A', '#DIV/0!', '#NAME?', '#NULL!', '#NUM!'];

/**
 * Returns true if a cell value should be treated as absent.
 */
function isAbsent(value) {
  if (value === null || value === undefined) return true;
  return PLACEHOLDERS.includes(String(value).trim().toLowerCase());
}

/**
 * Returns true if a cell contains a spreadsheet formula error.
 */
function isFormulaError(value) {
  if (value === null || value === undefined) return false;
  return FORMULA_ERRORS.includes(String(value).trim().toUpperCase());
}

/**
 * Parses a date from LR. Handles DD/MM/YYYY and DD-MM-YYYY.
 * Returns a Date object, or null if it can't be parsed.
 */
function parseDate(value) {
  if (isAbsent(value)) return null;

  const str = String(value).trim();
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Guard against rollover (e.g. 31/02/2026 becoming 03/03/2026)
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null;

  return date;
}

/**
 * Formats a Date as YYYY-MM-DD.
 */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DUE_TYPES = [
  { type: 'PS-CS',              deadlineCol: 'CS DEADLINE',          completionCol: 'Date of filing (CS)' },
  { type: 'FORM 1',             deadlineCol: 'Form-1 deadline',      completionCol: 'Form-1 date of filing' },
  { type: 'FORM 26',            deadlineCol: 'Form 26 Deadline',     completionCol: 'Form-26 date of filing' },
  { type: 'FORM 3',             deadlineCol: 'FORM 3 deadline',      completionCol: 'FORM 3 date of filing' },
  { type: 'FER',                deadlineCol: 'FER Reply Deadline',   completionCol: 'Date of filing FER Reply' },
  { type: 'WRITTEN SUBMISSION', deadlineCol: 'WS Deadline',          completionCol: 'Date of filing WS' },
];

const RENEWAL_PENDING_COL = 'Date of Next Renewal';
const RENEWAL_DONE_COL = 'Date of Renewal';
const HEARING_COL = 'Date of hearing';
const WS_FILED_COL = 'Date of filing WS';

module.exports = {
  isAbsent, isFormulaError, parseDate, toISO,
  DUE_TYPES, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, HEARING_COL, WS_FILED_COL,
};