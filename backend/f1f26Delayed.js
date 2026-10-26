const { parseDate, toISO } = require('./dueLogic');
const { makeCol } = require('./dueBuilder');

const DAY_MS = 24 * 60 * 60 * 1000;

// Post-date days left when the sheet says postdating hasn't started yet
// ("Not yet Postdated" / "PS Not yet filed") — the full 181-day window.
const FULL_POSTDATE_DAYS = 181;

const GRANTED_STATUS = 'Patent Granted';

const VERDICT = { CAN: 'Can be fixed', CANNOT: 'Cannot', UNKNOWN: 'Unknown' };
const VERDICT_RANK = { [VERDICT.CAN]: 0, [VERDICT.CANNOT]: 1, [VERDICT.UNKNOWN]: 2 };

// Whole calendar days from `earlier` to `later` (both local-midnight dates;
// rounding absorbs the odd 23/25-hour day at a DST change).
function daysBetween(later, earlier) {
  return Math.round((later - earlier) / DAY_MS);
}

// One form (F1 or F26) on its own. Returns null when there's no issue.
//   Delayed: filed, on a real date after the deadline.
//   Pending: not filed (nothing that parses as a date — blank, "NA",
//            "Not Filed" ...) and the deadline is a real date before today.
// Anything else — on time, not yet due, no usable deadline — is no issue.
function checkForm(deadlineRaw, filingRaw, today) {
  const deadline = parseDate(deadlineRaw);
  if (!deadline) return null;

  const filed = parseDate(filingRaw);
  if (filed) {
    return filed > deadline ? { status: 'Delayed', daysLate: daysBetween(filed, deadline) } : null;
  }
  return deadline < today ? { status: 'Pending', daysLate: daysBetween(today, deadline) } : null;
}

// Days of postdating still available, from "Remaining Post-Date Months".
// null means the text isn't one of the known shapes — reported as Unknown
// rather than guessed at.
function postDateDaysAvailable(raw) {
  const text = String(raw ?? '').trim();
  const inDays = text.match(/\((\d+)\s*days?\)/i);
  if (inDays) return parseInt(inDays[1], 10);
  const lower = text.toLowerCase();
  if (lower === 'not yet postdated' || lower === 'ps not yet filed') return FULL_POSTDATE_DAYS;
  return null;
}

// Prefer the ISO form of a real date; otherwise keep whatever text the
// sheet holds ("Not Filed", ...) so the detail view shows it as-is.
function dateOrText(raw) {
  const parsed = parseDate(raw);
  return parsed ? toISO(parsed) : String(raw ?? '').trim();
}

// Every application where Form 1 or Form 26 is Delayed or Pending, with a
// verdict on whether postdating can still fix it. `allRows` is the full row
// set (header first), index-aligned with `abandonedFlags`.
//
// One verdict per code: postdating has to cover the WORST form, so the days
// needed is the larger of the two days-late figures (Form 26's deadline is
// the earlier one and can need more than Form 1).
function buildF1F26Delayed(allRows, headers, abandonedFlags, today) {
  const col = makeCol(headers);
  const patents = [];

  allRows.forEach((row, i) => {
    if (i === 0) return;

    const code = String(col(row, 'Code')).trim();
    if (!code) return;

    // Abandoned (red Code cell) and granted applications need no follow-up.
    if (abandonedFlags[i]) return;
    const status = String(col(row, 'STATUS')).trim();
    if (status === GRANTED_STATUS) return;

    const form1 = checkForm(col(row, 'Form-1 deadline'), col(row, 'Form-1 date of filing'), today);
    const form26 = checkForm(col(row, 'Form 26 Deadline'), col(row, 'Form-26 date of filing'), today);
    if (!form1 && !form26) return;

    const daysNeeded = Math.max(form1 ? form1.daysLate : 0, form26 ? form26.daysLate : 0);
    const daysAvailable = postDateDaysAvailable(col(row, 'Remaining Post-Date Months'));
    let verdict = VERDICT.UNKNOWN;
    if (daysAvailable !== null) verdict = daysNeeded <= daysAvailable ? VERDICT.CAN : VERDICT.CANNOT;

    patents.push({
      code,
      applicationNumber: String(col(row, 'Application Number') || ''),
      assignedTo: col(row, 'Assigned to ') || col(row, 'Assigned to'),
      status,
      form1,
      form26,
      psFiled: dateOrText(col(row, 'date of filing (PS)')),
      csDeadline: dateOrText(col(row, 'CS DEADLINE')),
      csFiled: dateOrText(col(row, 'Date of filing (CS)')),
      form1Deadline: dateOrText(col(row, 'Form-1 deadline')),
      form1Filed: dateOrText(col(row, 'Form-1 date of filing')),
      form26Deadline: dateOrText(col(row, 'Form 26 Deadline')),
      form26Filed: dateOrText(col(row, 'Form-26 date of filing')),
      postDateText: String(col(row, 'Remaining Post-Date Months') ?? '').trim(),
      daysNeeded,
      daysAvailable,
      verdict,
    });
  });

  // Fixable first, then the least postdating needed; Unknown last.
  return patents.sort((a, b) =>
    VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]
    || a.daysNeeded - b.daysNeeded
    || a.code.localeCompare(b.code, undefined, { numeric: true }));
}

module.exports = { buildF1F26Delayed, VERDICT };
