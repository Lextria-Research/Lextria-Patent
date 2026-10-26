// November "issue" batch. Same pattern as importIssue.js (September) —
// drops any row whose live deadline has moved out of November 2026.
//
// Usage:
//   node scripts/importIssueNov.js          -> dry run
//   node scripts/importIssueNov.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, HEARING_COL, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, parseDate, toISO } = require('../dueLogic');

// [code, dueType, note]
const ROWS = [
  ['AR509', 'PS-CS', 'Preview issue: F13 not reflected - "DEPERTMENT" is still shown instead of "DEPARTMENT" for inventor Shashikiran Shanmugasundaram.'],
  ['AR517', 'PS-CS', 'Other issue: F2 PS - Page number is not mentioned'],
  ['HP05', 'PS-CS', 'Preview issue: ADDITION OF ONE INVENTOR IS FILED BUT IT IS NOT REFLECTED IN PREVIEW (PRASALI KULAL'],
  ['AR977', 'FORM 26', 'Other issue: In F1, the month is mentioned as June instead of July.'],
  ['AAIS121', 'PS-CS', 'Other issue: In the drawings, "FIG 2B" is mentioned as "FIG"'],
  ['AR754', 'FORM 26', 'Other issue: In F1, the page number of the CS is mentioned as 19 instead of 16.'],
  ['HP09', 'PS-CS', 'Preview issue: country reflected india in preview instead of UNITED ARAB EMIRATES'],
  ['AAIS127', 'PS-CS', 'Other issue: In F1, Section 4 (Inventor(s, both "Yes" and "No" are marked instead of marking only "Yes". Only 3 Forms uploaded; F3 and F5 not uploaded In F1, Page No of the PS is not mentioned'],
  ['AAIS128', 'PS-CS', 'Other issue: In F1, Section 4 (Inventor(s, both "Yes" and "No" are marked instead of marking only "Yes". Only 3 Forms uploaded; F3 and F5 not uploaded In F1, Page No of the PS is not mentioned'],
  ['AR961', 'FORM 26', 'Other issue: In F2, Page no 1 is repeated twice, In F1, the page no of CS is mentioned as 15 instead of 16'],
  ['AR552', 'PS-CS', 'Other issue: In the affiliation of inventor Shilpa Bala, "SCHOOL" contains an "O" in one instance and a zero "0" in the other.'],
  ['AR505', 'PS-CS', 'Other issue: In F1, the number of drawings is mentioned as 06 instead of 07.'],
  ['AR536', 'PS-CS', 'Preview issue: country refleted as U.S.A Insted of INDIA OF 2 Inventor named ADVIK KRITHIKSANKA, CHAITANYA PERALA MANISH'],
  ['AR726', 'FORM 26', 'Other issue: In F3, the date is mentioned as 16th August 2026 instead of 26th August 2026.'],
  ['MCODS03', 'PS-CS', 'Upload issue: Forms uploaded in portal wrong (MK10 forms uploaded in preview all information reflected correctly'],
  ['MCODS11', 'PS-CS', 'Preview issue: country wrongly reflected in preview as India instead of SAUDI ARABIA'],
];

function makeCol(headers) {
  return (row, name) => {
    const idx = headers.indexOf(name);
    return idx === -1 ? '' : (row[idx] ?? '');
  };
}

function resolveDueDate(sheetRow, col, dueType) {
  const standard = DUE_TYPES.find((t) => t.type === dueType);
  if (standard) {
    const raw = col(sheetRow, standard.deadlineCol);
    const d = parseDate(raw);
    if (!d) return { error: `sheet's ${standard.deadlineCol} is blank/unparseable (raw: ${JSON.stringify(raw)})` };
    return { iso: toISO(d) };
  }
  if (dueType === 'HEARING') {
    const raw = col(sheetRow, HEARING_COL);
    const d = parseDate(raw);
    if (!d) return { error: `sheet's ${HEARING_COL} is blank/unparseable` };
    return { iso: toISO(d) };
  }
  if (dueType === 'RENEWAL') {
    const candidates = [RENEWAL_PENDING_COL, RENEWAL_DONE_COL]
      .map((c) => parseDate(col(sheetRow, c)))
      .filter(Boolean);
    if (candidates.length === 0) return { error: 'neither renewal date column has a valid date' };
    if (candidates.length === 1) return { iso: toISO(candidates[0]) };
    return { error: 'both renewal columns have dates — ambiguous without a pasted date to disambiguate' };
  }
  return { error: `unknown due type "${dueType}"` };
}

async function main() {
  const apply = process.argv.includes('--apply');

  const rows = await sheetCache.getRows();
  const headers = rows[0];
  const dataRows = rows.slice(1);
  const col = makeCol(headers);

  const inNov = [];
  const dropped = [];
  const unresolved = [];

  for (const [code, dueType, note] of ROWS) {
    const sheetRow = dataRows.find((r) => r[0] === code);
    if (!sheetRow) {
      unresolved.push({ code, dueType, note, reason: 'code not found in sheet' });
      continue;
    }
    const result = resolveDueDate(sheetRow, col, dueType);
    if (result.error) {
      unresolved.push({ code, dueType, note, reason: result.error });
      continue;
    }
    const [y, m] = result.iso.split('-').map(Number);
    const entry = { code, dueType, dueDate: result.iso, note };
    if (y === 2026 && m === 11) inNov.push(entry);
    else dropped.push(entry);
  }

  console.log(`In November 2026: ${inNov.length}`);
  console.log(`Dropped (postdated/moved): ${dropped.length}`);
  console.log(`Unresolved: ${unresolved.length}\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.note}" -> ${u.reason}`));
    console.log('');
  }

  if (dropped.length) {
    console.log('--- DROPPED (live deadline not in November 2026) ---');
    dropped.forEach((d) => console.log(`${d.code} | ${d.dueType} | live ${d.dueDate} | "${d.note}"`));
    console.log('');
  }

  console.log('--- WOULD WRITE ---');
  inNov.forEach((r) => console.log(`${r.code} | ${r.dueType} | ${r.dueDate} | "${r.note}"`));

  if (!apply) {
    console.log('\nDry run only — no DB writes. Re-run with --apply to write.');
    return;
  }

  console.log('\nApplying...');
  let written = 0;
  for (const r of inNov) {
    const existing = await pool.query(
      'SELECT * FROM due_entries WHERE code = $1 AND type_of_due = $2 AND due_date = $3',
      [r.code, r.dueType, r.dueDate]
    );
    const prev = existing.rows[0] || null;
    await pool.query(
      `INSERT INTO due_entries
         (code, type_of_due, due_date, status, assigned_to, status_notes, suggested_action, issue, checklist_sent_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code, type_of_due, due_date)
       DO UPDATE SET issue = EXCLUDED.issue, updated_at = now()`,
      [
        r.code, r.dueType, r.dueDate,
        prev ? prev.status : null,
        prev ? prev.assigned_to : null,
        prev ? prev.status_notes : null,
        prev ? prev.suggested_action : null,
        r.note,
        prev ? prev.checklist_sent_date : null,
      ]
    );
    written += 1;
  }
  console.log(`Wrote ${written} row(s).`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
