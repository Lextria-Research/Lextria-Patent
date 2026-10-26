export const DUE_TYPE_OPTIONS = [
  'PS-CS', 'FORM 1', 'FORM 26', 'FER', 'FORM 3', 'FORM 18', 'HEARING', 'WRITTEN SUBMISSION', 'RENEWAL',
];

export function keyOf(d) {
  return `${d.code}|${d.dueType}|${d.deadline}`;
}

// Mirrors the backend's prefix extraction (patentClassification.js) —
// e.g. "AR1063" -> "AR". Used for the Code type filter and the per-type
// Excel export sheets on Patent filed.
export function codePrefix(code) {
  const match = String(code || '').trim().match(/^[A-Za-z_]+/);
  return match ? match[0].toUpperCase() : '';
}

// The sheet uses a lone "-" for "none"; a phone card hides such a line like an empty one.
export const isBlankValue = (v) => ['', '-', '\u2014'].includes(String(v ?? '').trim());

// Granted patents (phones): the renewal pill's text. The date is "Next renewal"
// (the sheet's "Date of Next Renewal"), the same date the backend compares
// to decide `isRenewalOverdue`, which is also what the desktop row
// highlight uses. Null when there is no next renewal date.
export function renewalLabel(p) {
  if (!p.nextRenewal) return null;
  const date = formatDate(p.nextRenewal);
  return p.isRenewalOverdue
    ? { text: `Renewal overdue · ${date}`, overdue: true }
    : { text: `Renewal ${date}`, overdue: false };
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Today" for the current day, otherwise like "Sun 20 Sep". `todayIso` comes
// from the server so the label agrees with which dues it put in the list.
export function formatDueSoonDate(iso, todayIso) {
  if (iso === todayIso) return 'Today';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS_SHORT[date.getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`;
}

// Phone cards and detail page only (desktop doesn't show it): whole days
// between an overdue due's deadline and the browser's local today, e.g.
// "3 days overdue". Empty unless the server marked the due overdue; the
// server's `overdue` decision is the gate, so this never contradicts it.
export function overdueLabel(due) {
  if (!due || due.status !== 'overdue' || !due.deadline) return '';
  const [y, m, d] = due.deadline.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(1, Math.round((today - new Date(y, m - 1, d)) / 86400000));
  return `${days} day${days === 1 ? '' : 's'} overdue`;
}

// F1/F26: the CSS classes for a verdict pill ("Can be fixed" / "Cannot" /
// anything else, i.e. "Unknown"). Shared by the table and the phone views.
export function verdictClass(verdict) {
  if (verdict === 'Can be fixed') return 'verdict verdict-can';
  if (verdict === 'Cannot') return 'verdict verdict-cannot';
  return 'verdict verdict-unknown';
}

// F9/F18 pending: the RFE deadline as the desktop table and detail page word
// it (a date, or the "Unknown ..." text when there is no parseable PS/CS date).
export function rfeDeadlineText(row) {
  return row.rfeDeadline ? formatDate(row.rfeDeadline) : 'Unknown (no parseable PS/CS date)';
}

// formatDate assumes an ISO yyyy-mm-dd string. Some fields (F9/F18 check)
// pass through raw sheet text ("NA", "-", malformed dates, ...) when a
// date wasn't parseable — formatDate would mangle that instead of just
// showing it. Anything that isn't a real ISO date is shown as-is.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function formatDateOrRaw(value) {
  if (!value) return '';
  return ISO_DATE_RE.test(value) ? formatDate(value) : value;
}

// Shortens the one due type long enough to force the column wide; filtering
// still compares against the full value, this only changes what's displayed.
export function shortDueType(type) {
  return type === 'WRITTEN SUBMISSION' ? 'WS' : type;
}

// Turn the LR sheet's F1/F26 wording into a short label.
// Returns null when there is nothing meaningful to show.
export function shortFormStatus(raw) {
  const v = String(raw || '').trim();
  if (!v || v.startsWith('#') || /no f(1|26) deadline/i.test(v)) return null;

  if (/within deadline/i.test(v)) return { text: 'within deadline', tone: 'ok' };

  const delayed = v.match(/delayed by (\d+) days?/i);
  if (delayed) return { text: `delayed ${delayed[1]}d`, tone: 'bad' };

  const after = v.match(/after (\d+) days? of deadline/i);
  if (after) return { text: `late ${after[1]}d`, tone: 'bad' };

  const left = v.match(/(\d+) days? left/i);
  if (left) return { text: `${left[1]}d left`, tone: 'wait' };

  return { text: v, tone: 'wait' };
}
