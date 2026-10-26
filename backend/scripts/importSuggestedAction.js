// Suggested-action batch. Writes due_entries.suggested_action (free text,
// same pattern as status_notes) — matches each (code, dueType) to its
// CURRENT live deadline rather than trusting any pasted date, preserves
// every other column on write. This list gave no due type, so types were
// cross-referenced against the September batch (all PS-CS except AR772,
// which is FORM 1).
//
// Usage:
//   node scripts/importSuggestedAction.js          -> dry run
//   node scripts/importSuggestedAction.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, HEARING_COL, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, parseDate, toISO } = require('../dueLogic');

// [code, dueType, note]
const ROWS = [
  ['P18', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR441', 'PS-CS', 'Draft sent to inventor with asking additional information 26/08/2026'],
  ['AAIS104', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['SP29', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR403', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR444', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR448', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR450', 'PS-CS', 'Inventor said they have no data so 6 month posdate'],
  ['AR453', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR469', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AAIS103', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR449', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AAIS111', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR114', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR400', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['DH06', 'PS-CS', 'sir need to adress ticket has to be addressed'],
  ['SP35', 'PS-CS', 'make data'],
  ['AR474', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR476', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['MCODS17', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['WTMS02', 'PS-CS', 'post date and make data'],
  ['WTMS03', 'PS-CS', 'post date and make data'],
  ['AR481', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR772', 'FORM 1', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['PRS07', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['SP06', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR479', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR150', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR151', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR152', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR179', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR180', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR181', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
  ['AR186', 'PS-CS', 'qurey sent in LR qurey group - Action needed from Pranav Sir'],
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

  const resolved = [];
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
    resolved.push({ code, dueType, dueDate: result.iso, note });
  }

  console.log(`Resolved: ${resolved.length}  Unresolved: ${unresolved.length}\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED (not written, need review) ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.note}" -> ${u.reason}`));
    console.log('');
  }

  console.log('--- RESOLVED ---');
  resolved.forEach((r) => console.log(`${r.code} | ${r.dueType} | ${r.dueDate} | "${r.note}"`));

  if (!apply) {
    console.log('\nDry run only — no DB writes. Re-run with --apply to write.');
    return;
  }

  console.log('\nApplying...');
  let written = 0;
  for (const r of resolved) {
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
       DO UPDATE SET suggested_action = EXCLUDED.suggested_action, updated_at = now()`,
      [
        r.code, r.dueType, r.dueDate,
        prev ? prev.status : null,
        prev ? prev.assigned_to : null,
        prev ? prev.status_notes : null,
        r.note,
        prev ? prev.issue : null,
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
