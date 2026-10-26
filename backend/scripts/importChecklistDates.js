// Checklist-sent-date batch (Sept + Oct codes). Unlike status_notes, this
// writes to due_entries.checklist_sent_date, an actual SQL date column —
// so each pasted value is parsed, not stored as free text. Values like
// "Not sent" / "NA" mean no date and are skipped. Values like "Follow-up
// done on X" aren't a checklist-sent date at all (different meaning) and
// are left unresolved for manual review rather than guessed.
//
// The source list only gave code + value, no due type — every code here
// matches one from the September/October status_notes batches, so the
// type is pulled from there (backend/scripts/importStatusNotes.js and
// importStatusNotesOct.js) rather than re-typed.
//
// Usage:
//   node scripts/importChecklistDates.js          -> dry run
//   node scripts/importChecklistDates.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, HEARING_COL, parseDate, toISO } = require('../dueLogic');

const SKIP_VALUES = new Set(['not sent', 'na']);
const DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

// [code, dueType, rawValue]
const ROWS = [
  ['P18', 'PS-CS', '17/06/2026'],
  ['AR313', 'PS-CS', '21/08/2026'],
  ['AAIS165', 'FORM 26', 'Follow-up done on 21/08/2026'],
  ['CD56', 'PS-CS', '23/10/2025'],
  ['SP15', 'PS-CS', '19/07/2026'],
  ['MB26', 'PS-CS', '17/09/2026'],
  ['AAIS104', 'PS-CS', '17/08/2025'],
  ['SP19', 'PS-CS', '07/02/2026'],
  ['AR169', 'PS-CS', '31/05/2025'],
  ['CD60', 'FORM 1', 'Not sent'],
  ['AR403', 'PS-CS', '28/08/2026'],
  ['AR448', 'PS-CS', '28/08/2026'],
  ['AR453', 'PS-CS', '20/05/2026'],
  ['AAIS103', 'PS-CS', 'NOT SENT'],
  ['MI132', 'FORM 1', 'NA'],
  ['AAIS111', 'PS-CS', 'NOT SENT'],
  ['AR188', 'PS-CS', '04/11/2025'],
  ['AR114', 'PS-CS', '28/08/2026'],
  ['AR400', 'PS-CS', '23/09/2025'],
  ['MI90', 'FORM 1', 'NA'],
  ['MI133', 'FORM 1', 'Not sent'],
  ['MI67', 'FORM 1', 'Not sent'],
  ['MI85', 'FORM 1', 'Not sent'],
  ['MI118', 'FORM 1', 'Not sent'],
  ['DH06', 'PS-CS', '25/04/2026'],
  ['SP35', 'PS-CS', '25/06/2026'],
  ['AR476', 'PS-CS', '28/08/2026'],
  ['MCODS17', 'PS-CS', '28/08/2026'],
  ['AR360', 'PS-CS', '21/08/2026'],
  ['AR772', 'FORM 1', 'Follow-up done on 21/08/2026'],
  ['AR310', 'PS-CS', '29/06/2026'],
  ['AR311', 'PS-CS', '29/06/2026'],
  ['AR770', 'FORM 1', 'Follow-up done on 21/08/2026'],
  ['AR780', 'FORM 1', 'Follow-up done on 21/08/2026'],
  ['CD45', 'PS-CS', '11/05/2026'],
  ['CD52', 'PS-CS', '22/01/2026'],
  ['AR387', 'PS-CS', '09/03/2026'],
  ['AR388', 'PS-CS', '13/08/2026'],
  ['AR186', 'PS-CS', '25/02/2026'],
  ['SP02', 'PS-CS', '22/04/2026'],
  ['MCODS01', 'PS-CS', '08/11/2025'],
  ['AR115', 'PS-CS', 'NA'],
  ['AR117', 'PS-CS', 'NA'],
  ['AR430', 'PS-CS', '29/08/2026'],
  ['AR438', 'PS-CS', '29/08/2026'],
  ['MCODS20', 'PS-CS', '29/08/2026'],
  ['AR467', 'PS-CS', '03/09/2026'],
  ['AR112', 'PS-CS', '29/08/2026'],
  ['CH17', 'PS-CS', '31/08/2026'],
  ['AR354', 'PS-CS', '31/08/2026'],
  ['AR501', 'PS-CS', '31/08/2026'],
  ['MCODS05', 'PS-CS', '29/08/2026'],
  ['AR389', 'PS-CS', '29/07/2026'],
  ['AR343', 'PS-CS', '03/09/2026'],
  ['AR351', 'PS-CS', '26/06/2026'],
  ['MCODS15', 'PS-CS', '31/08/2026'],
  ['AAIS157', 'FORM 26', 'NA'],
  ['AAIS174', 'FORM 26', 'NA'],
  ['AR420', 'PS-CS', '31/08/2026'],
  ['AR421', 'PS-CS', '31/08/2026'],
  ['PH44', 'PS-CS', '29/08/2026'],
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

  const toWrite = [];
  const skipped = [];
  const unresolved = [];
  const notADate = [];

  for (const [code, dueType, rawValue] of ROWS) {
    const norm = rawValue.trim().toLowerCase();
    if (SKIP_VALUES.has(norm)) {
      skipped.push({ code, dueType, rawValue });
      continue;
    }

    const sheetRow = dataRows.find((r) => r[0] === code);
    if (!sheetRow) {
      unresolved.push({ code, dueType, rawValue, reason: 'code not found in sheet' });
      continue;
    }
    const result = resolveDueDate(sheetRow, col, dueType);
    if (result.error) {
      unresolved.push({ code, dueType, rawValue, reason: result.error });
      continue;
    }

    if (!DATE_RE.test(rawValue.trim())) {
      notADate.push({ code, dueType, dueDate: result.iso, rawValue });
      continue;
    }

    const parsed = parseDate(rawValue.trim());
    if (!parsed) {
      unresolved.push({ code, dueType, rawValue, reason: 'value looked date-shaped but failed to parse' });
      continue;
    }

    toWrite.push({ code, dueType, dueDate: result.iso, checklistDate: toISO(parsed) });
  }

  console.log(`Would write:            ${toWrite.length}`);
  console.log(`Skipped (not sent/NA):  ${skipped.length}`);
  console.log(`Not a date (need call): ${notADate.length}`);
  console.log(`Unresolved:             ${unresolved.length}\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.rawValue}" -> ${u.reason}`));
    console.log('');
  }

  if (notADate.length) {
    console.log('--- NOT A DATE (not written, need your call) ---');
    notADate.forEach((n) => console.log(`${n.code} | ${n.dueType} | due ${n.dueDate} | "${n.rawValue}"`));
    console.log('');
  }

  console.log('--- WOULD WRITE ---');
  toWrite.forEach((w) => console.log(`${w.code} | ${w.dueType} | due ${w.dueDate} | checklist_sent_date = ${w.checklistDate}`));

  if (!apply) {
    console.log(`\nDry run only — no DB writes. Re-run with --apply to write.`);
    return;
  }

  console.log('\nApplying...');
  let written = 0;
  for (const w of toWrite) {
    const existing = await pool.query(
      'SELECT * FROM due_entries WHERE code = $1 AND type_of_due = $2 AND due_date = $3',
      [w.code, w.dueType, w.dueDate]
    );
    const prev = existing.rows[0] || null;
    await pool.query(
      `INSERT INTO due_entries
         (code, type_of_due, due_date, status, assigned_to, status_notes, suggested_action, issue, checklist_sent_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code, type_of_due, due_date)
       DO UPDATE SET checklist_sent_date = EXCLUDED.checklist_sent_date, updated_at = now()`,
      [
        w.code, w.dueType, w.dueDate,
        prev ? prev.status : null,
        prev ? prev.assigned_to : null,
        prev ? prev.status_notes : null,
        prev ? prev.suggested_action : null,
        prev ? prev.issue : null,
        w.checklistDate,
      ]
    );
    written += 1;
  }
  console.log(`Wrote ${written} row(s).`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
