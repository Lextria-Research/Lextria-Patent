// October status-notes batch. See importStatusNotes.js (September) for the
// full explanation of the matching/preservation logic — this is the same
// approach, kept as a separate file per batch so there's an audit trail of
// what was imported and when.
//
// Usage:
//   node scripts/importStatusNotesOct.js          -> dry run, no DB writes
//   node scripts/importStatusNotesOct.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, HEARING_COL, parseDate, toISO } = require('../dueLogic');

const TYPE_ALIASES = {
  'WRITTEN SUBMISSON': 'WRITTEN SUBMISSION', // common typo in pasted lists
};

// [code, dueType, pastedDate(DD/MM/YYYY), note]
const ROWS = [
  ['MCODS01', 'PS-CS', '03/10/2026', 'Awaiting data'],
  ['AR451', 'PS-CS', '04/10/2026', 'Specific cheklist sent on 31/08/2026'],
  ['AR115', 'PS-CS', '07/10/2026', 'under drafting'],
  ['AR117', 'PS-CS', '07/10/2026', 'under drafting'],
  ['AR430', 'PS-CS', '07/10/2026', 'AWAIITNG FOR RESPONSE TO CHECKLIST'],
  ['AR438', 'PS-CS', '07/10/2026', 'AWAIITNG FOR RESPONSE TO CHECKLIST'],
  ['MCODS20', 'PS-CS', '07/10/2026', 'AWAIITNG FOR RESPONSE TO CHECKLIST'],
  ['AR467', 'PS-CS', '08/10/2026', 'Checklist sent on 03/09/2026'],
  ['AR265', 'PS-CS', '09/10/2026', 'Followup mail sent on 03/09/2026'],
  ['AR112', 'PS-CS', '10/10/2026', 'checklist sent and awaiitng for response'],
  ['CH17', 'PS-CS', '11/10/2026', 'Checklist sent on 31/08/2026'],
  ['AR10', 'FORM 3', '14/10/2026', 'Filed'],
  ['AR354', 'PS-CS', '14/10/2026', 'checklist sent on 31/08/2026'],
  ['MS10', 'FORM 3', '14/10/2026', 'Filed'],
  ['AR501', 'PS-CS', '15/10/2026', 'Checklist sent on 31/08/2026'],
  ['KM09', 'FORM 3', '15/10/2026', 'Filed'],
  ['MCODS05', 'PS-CS', '15/10/2026', 'checklist sent and awaiitng for response'],
  ['AR389', 'PS-CS', '20/10/2026', 'checklist sent and awaitng for response'],
  ['KM01', 'FORM 3', '22/10/2026', 'Filed'],
  ['AAIS150', 'FORM 3', '24/10/2026', 'Filed'],
  ['AR343', 'PS-CS', '24/10/2026', 'checklist sent on 03/09/2026'],
  ['MI36', 'PS-CS', '24/10/2026', 'Followup mail sent on 03/09/2026'],
  ['YIT06', 'FORM 26', '24/10/2026', 'Pending for F26 communication'],
  ['AR168', 'PS-CS', '25/10/2026', 'Followup mail sent on 03/09/2026'],
  ['AR351', 'PS-CS', '27/10/2026', 'Checklist sent and awaiting for data'],
  ['MCODS15', 'PS-CS', '27/10/2026', 'Awaiting data'],
  ['AAIS157', 'FORM 26', '29/10/2026', 'Filed'],
  ['AAIS174', 'FORM 26', '30/10/2026', 'Pending for F26 communication'],
  ['AR420', 'PS-CS', '31/10/2026', 'Awaiting data'],
  ['AR421', 'PS-CS', '31/10/2026', 'Awaiting data'],
  ['PH44', 'PS-CS', '31/10/2026', 'Checklist sent and awaiting for data'],
  ['YIT07', 'FORM 26', '31/10/2026', 'Pending for F26 communication'],
  ['YIT08', 'FORM 26', '31/10/2026', 'Pending for F26 communication'],
  ['YIT09', 'FORM 26', '31/10/2026', 'Pending for F26 communication'],
];

function makeCol(headers) {
  return (row, name) => {
    const idx = headers.indexOf(name);
    return idx === -1 ? '' : (row[idx] ?? '');
  };
}

function resolveDueDate(sheetRow, col, dueType, pastedDateStr) {
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
    if (!d) return { error: `sheet's ${HEARING_COL} is blank/unparseable (raw: ${JSON.stringify(raw)})` };
    return { iso: toISO(d) };
  }

  if (dueType === 'RENEWAL') {
    const pasted = parseDate(pastedDateStr);
    const candidates = [RENEWAL_PENDING_COL, RENEWAL_DONE_COL]
      .map((c) => ({ col: c, d: parseDate(col(sheetRow, c)) }))
      .filter((c) => c.d);
    if (candidates.length === 0) return { error: 'neither renewal date column has a valid date' };
    const match = candidates.find((c) => pasted && toISO(c.d) === toISO(pasted));
    if (match) return { iso: toISO(match.d) };
    if (candidates.length === 1) return { iso: toISO(candidates[0].d) };
    return { error: `both renewal columns have dates (${candidates.map((c) => `${c.col}=${toISO(c.d)}`).join(', ')}) and neither matches the pasted date ${pastedDateStr}` };
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

  for (const [code, rawType, pastedDate, note] of ROWS) {
    const dueType = TYPE_ALIASES[rawType] || rawType;
    const sheetRow = dataRows.find((r) => r[0] === code);
    if (!sheetRow) {
      unresolved.push({ code, dueType, note, reason: 'code not found in sheet' });
      continue;
    }
    const result = resolveDueDate(sheetRow, col, dueType, pastedDate);
    if (result.error) {
      unresolved.push({ code, dueType, note, reason: result.error });
      continue;
    }
    resolved.push({ code, dueType, dueDate: result.iso, pastedDate, note });
  }

  console.log(`Resolved: ${resolved.length}  Unresolved: ${unresolved.length}\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED (not written, need review) ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.note}" -> ${u.reason}`));
    console.log('');
  }

  console.log('--- RESOLVED ---');
  let mismatchCount = 0;
  for (const r of resolved) {
    const pastedISO = toISO(parseDate(r.pastedDate));
    const drift = pastedISO !== r.dueDate ? `  [DATE DRIFT: pasted ${r.pastedDate} -> live ${r.dueDate}]` : '';
    if (drift) mismatchCount += 1;
    console.log(`${r.code} | ${r.dueType} | ${r.dueDate} | "${r.note}"${drift}`);
  }
  if (mismatchCount) console.log(`\n${mismatchCount} row(s) had a live deadline different from the pasted date — double-check those.`);

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
       DO UPDATE SET status_notes = EXCLUDED.status_notes, updated_at = now()`,
      [
        r.code, r.dueType, r.dueDate,
        prev ? prev.status : null,
        prev ? prev.assigned_to : null,
        r.note,
        prev ? prev.suggested_action : null,
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
