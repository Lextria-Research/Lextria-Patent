const { parseDate, toISO } = require('./dueLogic');

// DATA sheet columns this check reads. `index` is the column-letter
// position given by the business spec (A=0, K=10, ...) — used as a
// fallback and a drift check, not the primary lookup. Header text is
// matched case-insensitively/trimmed since casing is inconsistent in the
// sheet itself.
const EXPECTED_COLUMNS = {
  code:            { letter: 'A',  index: 0,  header: 'code' },
  applicationNo:   { letter: 'K',  index: 10, header: 'application number' },
  psFilingDate:    { letter: 'L',  index: 11, header: 'date of filing (ps)' },
  csFilingDate:    { letter: 'Q',  index: 16, header: 'date of filing (cs)' },
  f9FilingDate:    { letter: 'Y',  index: 24, header: 'form-9 date of filing' },
  f18FilingDate:   { letter: 'AB', index: 27, header: 'form-18/18a date of filing' },
  publicationDate: { letter: 'AC', index: 28, header: 'date of publication' },
  status:          { letter: 'BM', index: 64, header: 'status' },
  // No fixed letter given for these — resolved by header name only, same
  // as every other backend module. Used for extra context columns on the
  // pending-bucket output, not for any eligibility/status logic.
  title:           { header: 'title' },
  applicantName:   { header: 'applicant name' },
  inventorName:    { header: 'inventor name' },
  assignedTo:      { header: 'assigned to' },
};

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase();
}

// Resolves each expected column by header name first (robust to columns
// being inserted/removed elsewhere in the sheet), falling back to the
// spec's fixed letter position if the header text isn't found (only the
// core columns have one), and warning either way if the two disagree —
// a cheap tripwire for sheet drift instead of silently miscounting.
function resolveColumns(headers) {
  const resolved = {};
  Object.entries(EXPECTED_COLUMNS).forEach(([key, spec]) => {
    let idx = headers.findIndex((h) => normalizeHeader(h) === spec.header);
    if (idx === -1 && spec.index !== undefined) {
      console.warn(`F9/F18 check: header "${spec.header}" not found by name, falling back to column ${spec.letter}`);
      idx = spec.index;
    } else if (idx === -1) {
      console.warn(`F9/F18 check: header "${spec.header}" not found — this column will read blank`);
    } else if (spec.index !== undefined && idx !== spec.index) {
      console.warn(
        `F9/F18 check: header "${spec.header}" found at column index ${idx}, expected ${spec.index} ` +
        `(column ${spec.letter}) — sheet layout may have shifted`
      );
    }
    resolved[key] = idx;
  });
  return resolved;
}

// "Filed"/"Pending"/"Unclear" classification shared by CS, F9 and F18
// filing-date fields. A real date or any other non-blank text counts as
// filed — these fields sometimes hold malformed/double-date text that
// still means "yes, this was filed."
const NOT_FILED_EXACT = ['na', 'not filed', '-'];

function fieldStatus(raw) {
  const str = String(raw ?? '').trim();
  if (str === '') return 'PENDING';
  const lower = str.toLowerCase();
  if (NOT_FILED_EXACT.includes(lower) || lower.includes('not filed')) return 'PENDING';
  if (lower.includes('due date on')) return 'UNCLEAR';
  return 'FILED';
}

// Looser blank check for Date of Publication — this field only needs a
// presence/absence read, not the three-way filed/pending/unclear split.
function isBlankish(raw) {
  const str = String(raw ?? '').trim().toLowerCase();
  return str === '' || str === 'na' || str === '-';
}

function f9StatusLabel(f9Status, unpublished) {
  if (f9Status === 'FILED') return 'Filed';
  return unpublished ? 'Pending' : 'Not applicable (published)';
}

// Patents (Amendment) Rules 2024 transitional provision.
const RULE_CUTOFF = new Date(2024, 2, 15); // 15-Mar-2024

function addMonths(date, months) {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

function rfeDeadlineFor(priorityDate) {
  const months = priorityDate >= RULE_CUTOFF ? 31 : 48;
  return addMonths(priorityDate, months);
}

// STATUS text that can only be reached once examination has actually
// started — i.e. Form-18/RFE must already be on file. "Published" is
// deliberately excluded: early publication is a separate, optional track
// that doesn't require Form-18 at all.
const FURTHER_PROGRESS_KEYWORDS = ['FER', 'WRITTEN SUBMISSION', 'WS', 'HEARING', 'GRANT', 'GRANTED', 'RENEWAL'];

function hasFurtherProgress(statusText) {
  const upper = statusText.toUpperCase();
  return FURTHER_PROGRESS_KEYWORDS.some((kw) => upper.includes(kw));
}

// Builds the F9/F18 pending report from every DATA sheet row.
// `allRows` must be the full, unfiltered row set (header + every data
// row) — this check needs to see blank-Code rows to report them, unlike
// every other tab which silently drops them.
function buildF9F18Check(allRows, headers, abandonedFlags, today = new Date()) {
  const cols = resolveColumns(headers);
  const cutoffToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const result = {
    bothPending: [],
    f9PendingOnly: [],
    f18PendingOnly: [],
    duplicateApplicationNumbers: [],
    statusContradictions: [],
    unclear: [],
    blankCode: [],
  };

  const appNoToCodes = new Map();

  allRows.forEach((row, i) => {
    if (i === 0) return; // header row

    // A row with nothing but blank/placeholder cells ('', "NA", "-") in any
    // of its ~65 columns is padding past the end of real data, not a
    // record — a deadline formula filled down the sheet past the last real
    // row leaves exactly this ("WS Deadline" = "NA") on hundreds of empty
    // rows, which isBlankish already treats as blank everywhere else. A row
    // with even one cell beyond that counts as real — including a
    // blank-Code row whose only content is somewhere else entirely, which
    // is exactly the data gap this check needs to surface, not silently
    // swallow.
    const isRowEmpty = row.every((cell) => isBlankish(cell));
    if (isRowEmpty) return;

    const code = String(row[cols.code] ?? '').trim();
    const applicationNumber = String(row[cols.applicationNo] ?? '').trim();

    if (!code) {
      result.blankCode.push({ rowNumber: i + 1, applicationNumber });
      return;
    }

    // Placeholder text ("NA", "-", ...) means "no application number yet"
    // — not a real value to dedupe on, or every not-yet-filed row would
    // false-positive as one giant "duplicate." Tracked for every row with
    // a code, regardless of what happens below — a shared application
    // number is a data problem independent of filing/pending status.
    if (applicationNumber && !isBlankish(applicationNumber)) {
      if (!appNoToCodes.has(applicationNumber)) appNoToCodes.set(applicationNumber, new Set());
      appNoToCodes.get(applicationNumber).add(code);
    }

    const csStatus = fieldStatus(row[cols.csFilingDate]);
    if (csStatus === 'UNCLEAR') {
      result.unclear.push({ code, applicationNumber, field: 'CS filing date', raw: String(row[cols.csFilingDate] ?? '').trim() });
      return;
    }
    if (csStatus !== 'FILED') return; // not eligible — CS not yet filed

    const psStatus = fieldStatus(row[cols.psFilingDate]);
    const f9Status = fieldStatus(row[cols.f9FilingDate]);
    const f18Status = fieldStatus(row[cols.f18FilingDate]);

    // Unclear F9/F18 text is a data-quality issue in its own right —
    // surfaced here regardless of abandoned status, same as CS above —
    // and, like every other bucket, mutually exclusive with everything
    // else: a row goes to exactly one output.
    if (f9Status === 'UNCLEAR' || f18Status === 'UNCLEAR') {
      result.unclear.push({
        code,
        applicationNumber,
        field: f9Status === 'UNCLEAR' ? 'Form-9 filing date' : 'Form-18 filing date',
        raw: f9Status === 'UNCLEAR' ? String(row[cols.f9FilingDate] ?? '').trim() : String(row[cols.f18FilingDate] ?? '').trim(),
      });
      return;
    }

    // Abandoned (red Code cell) rows still get the data-quality checks
    // above — the sheet's own text can still be wrong even for a dead
    // application — but need no prosecution follow-up, so they stop here.
    if (abandonedFlags[i]) return;

    const statusText = String(row[cols.status] ?? '').trim();
    const unpublished = isBlankish(row[cols.publicationDate]);

    const csFilingDate = parseDate(row[cols.csFilingDate]);
    const priorityDate = psStatus === 'FILED' ? parseDate(row[cols.psFilingDate]) || csFilingDate : csFilingDate;

    let rfeDeadline = null;
    let deadlineLapsed = false;
    if (priorityDate) {
      const deadline = rfeDeadlineFor(priorityDate);
      rfeDeadline = toISO(deadline);
      deadlineLapsed = deadline < cutoffToday;
    }

    const f9Pending = f9Status === 'PENDING' && unpublished;
    const f18Pending = f18Status === 'PENDING';

    // A contradiction takes priority over a normal pending bucket — a row
    // is either flagged for review here, or reported as routinely
    // pending, never both.
    if ((f9Pending || f18Pending) && hasFurtherProgress(statusText)) {
      result.statusContradictions.push({
        code,
        applicationNumber,
        status: statusText,
        f9Status: f9StatusLabel(f9Status, unpublished),
        f18Status: f18Pending ? 'Pending' : 'Filed',
      });
      return;
    }

    if (f9Pending || f18Pending) {
      const publicationDateParsed = parseDate(row[cols.publicationDate]);
      const rowOut = {
        code,
        applicationNumber,
        title: String(row[cols.title] ?? '').trim(),
        applicantName: String(row[cols.applicantName] ?? '').trim(),
        inventorName: String(row[cols.inventorName] ?? '').trim(),
        assignedTo: String(row[cols.assignedTo] ?? '').trim(),
        csFilingDate: csFilingDate ? toISO(csFilingDate) : String(row[cols.csFilingDate] ?? '').trim(),
        publicationDate: publicationDateParsed ? toISO(publicationDateParsed) : String(row[cols.publicationDate] ?? '').trim(),
        f9Status: f9StatusLabel(f9Status, unpublished),
        f18Status: f18Status === 'FILED' ? 'Filed' : 'Pending',
        rfeDeadline,
        deadlineLapsed,
      };

      if (f9Pending && f18Pending) result.bothPending.push(rowOut);
      else if (f9Pending) result.f9PendingOnly.push(rowOut);
      else result.f18PendingOnly.push(rowOut);
    }
  });

  appNoToCodes.forEach((codes, applicationNumber) => {
    if (codes.size > 1) {
      result.duplicateApplicationNumbers.push({ applicationNumber, codes: [...codes].sort() });
    }
  });

  return result;
}

module.exports = { buildF9F18Check, resolveColumns, fieldStatus, rfeDeadlineFor };
