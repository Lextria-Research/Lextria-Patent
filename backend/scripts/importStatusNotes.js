// One-off importer for bulk-filling due_entries.status_notes from a pasted
// month's status list. Matches each (code, dueType) to its CURRENT deadline
// in the live sheet (not the date pasted alongside the note) so the note
// lands on the exact due_date the app will look up later, even if the sheet
// has drifted since the list was compiled. Preserves every other column on
// an existing row — only status_notes is touched.
//
// Usage:
//   node scripts/importStatusNotes.js          -> dry run, no DB writes
//   node scripts/importStatusNotes.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, HEARING_COL, parseDate, toISO } = require('../dueLogic');

const TYPE_ALIASES = {
  'WRITTEN SUBMISSON': 'WRITTEN SUBMISSION', // common typo in pasted lists
};

// [code, dueType, pastedDate(DD/MM/YYYY), note]
const ROWS = [
  ['AR418', 'PS-CS', '02/09/2026', 'Filed'],
  ['AAIS112', 'FORM 1', '04/09/2026', 'Refiled With Code AAIS112 A'],
  ['AAIS165', 'FORM 26', '04/09/2026', 'F26 NOT RECEIVED'],
  ['CC01', 'FORM 1', '04/09/2026', 'Followup mail sent on 21/08/2026'],
  ['CC02', 'FORM 1', '04/09/2026', 'Followup mail sent on 21/08/2026'],
  ['SJEC27', 'FORM 26', '04/09/2026', 'Filed'],
  ['SP15', 'PS-CS', '04/09/2026', 'Filed'],
  ['MB26', 'PS-CS', '04/09/2026', 'Filed'],
  ['SP18', 'PS-CS', '06/09/2026', 'RED'],
  ['SP19', 'PS-CS', '07/09/2026', 'awaiitng for data -Abonden mail sent'],
  ['AAIS65', 'RENEWAL', '08/09/2026', 'Patent Granted'],
  ['AR169', 'PS-CS', '09/09/2026', 'under drafting'],
  ['AR468', 'FORM 1', '09/09/2026', 'Followup mail sent on 21/08/2026'],
  ['KM20', 'FORM 3', '09/09/2026', 'Filed'],
  ['CD08', 'PS-CS', '09/09/2026', 'Abandon mail sent on 21/08/2026'],
  ['CD60', 'FORM 1', '09/09/2026', 'Awaiting Signed Form-1'],
  ['AR444', 'PS-CS', '10/09/2026', 'Followup mail for checklist sent on 28/08/2026'],
  ['AR445', 'PS-CS', '10/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR446', 'PS-CS', '10/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR448', 'PS-CS', '10/09/2026', 'Awaiting data'],
  ['AR453', 'PS-CS', '10/09/2026', 'Under Inventor review'],
  ['AR469', 'PS-CS', '10/09/2026', 'Followup mail for checklist sent on 28/08/2026'],
  ['AAIS103', 'PS-CS', '11/09/2026', 'CEHCKSLIST NOT SENT DUE TO ISSUE'],
  ['AR449', 'PS-CS', '11/09/2026', 'checklist sent on 28/08/2026'],
  ['CH01', 'PS-CS', '11/09/2026', 'Followup mail sent on 21/08/2026'],
  ['CH02', 'PS-CS', '11/09/2026', 'Followup mail sent on 21/08/2026'],
  ['CH03', 'PS-CS', '11/09/2026', 'Followup mail sent on 21/08/2026'],
  ['MI132', 'FORM 1', '11/09/2026', 'SIGNED F1 NOT RECEIVED / PETETION MAIL SENT ON 29/06/2026'],
  ['AAIS111', 'PS-CS', '12/09/2026', 'CHECKLIST NOT SENT DUE TO ISSUE'],
  ['AR188', 'PS-CS', '12/09/2026', 'Under due deligence'],
  ['AR281', 'PS-CS', '12/09/2026', 'Followup mail sent on 21/08/2026'],
  ['CD58', 'PS-CS', '12/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR114', 'PS-CS', '13/09/2026', 'Awaiting response to checklist'],
  ['AR400', 'PS-CS', '13/09/2026', 'Awaiting for data'],
  ['MI134', 'FORM 1', '13/09/2026', 'Followup mail sent on 21/08/2026'],
  ['MI90', 'FORM 1', '13/09/2026', 'Signed F1 not received / petetion mail sent on 10/07/2026'],
  ['MI133', 'FORM 1', '15/09/2026', 'Awaiting Signed Form-1'],
  ['MI67', 'FORM 1', '15/09/2026', 'Awaiting Signed Form-1'],
  ['MI85', 'FORM 1', '15/09/2026', 'Awaiting Signed Form-1'],
  ['AR970', 'FORM 26', '17/09/2026', 'Filed'],
  ['MI118', 'FORM 1', '17/09/2026', 'Awaiting Signed Form-1'],
  ['AR1003', 'FORM 26', '18/09/2026', 'Filed'],
  ['SP35', 'PS-CS', '18/09/2026', 'SIR MAILED ON 25/06/2026 to fill in the checklist; we have not heard back anything yet'],
  ['AR474', 'PS-CS', '18/09/2026', 'checklist sent on 28/08/2026'],
  ['AR476', 'PS-CS', '18/09/2026', 'Awaiting data'],
  ['PRS04', 'FER', '18/09/2026', 'post dated to september'],
  ['AR907', 'FORM 26', '18/09/2026', 'Filed'],
  ['AR927', 'FORM 26', '18/09/2026', 'Filed'],
  ['AR968', 'FORM 26', '18/09/2026', 'Filed'],
  ['AR227', 'PS-CS', '19/09/2026', '1. CS Draft sent to the inventor on 29/07/2026 2. Followup mail sent on 21/08/2026'],
  ['AR921', 'FORM 26', '19/09/2026', 'Filed'],
  ['MCODS17', 'PS-CS', '19/09/2026', 'Awaiting for data'],
  ['WTMS02', 'PS-CS', '20/09/2026', 'Filed'],
  ['WTMS03', 'PS-CS', '20/09/2026', 'POST date to 20/09/2026'],
  ['AR686', 'FORM 1', '21/09/2026', 'Followup mail sent on 21/08/2026'],
  ['SCEM06', 'HEARING', '21/09/2026', 'Hearing Attended - WS Not Filed'],
  ['AAIS166', 'FORM 26', '22/09/2026', 'Filed'],
  ['AR360', 'PS-CS', '22/09/2026', 'AWATING FOR DATA'],
  ['AR481', 'PS-CS', '22/09/2026', 'checklist sent on 28/08/2026'],
  ['AR772', 'FORM 1', '23/09/2026', 'Signed Form-1 not received from inventor'],
  ['AR981', 'FORM 26', '23/09/2026', 'Filed'],
  ['CD12', 'PS-CS', '23/09/2026', 'PS Filed - CS Not Filed'],
  ['AR310', 'PS-CS', '24/09/2026', 'Awaiting for data'],
  ['AR311', 'PS-CS', '24/09/2026', 'Awaiting for data'],
  ['AR687', 'FORM 1', '24/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR689', 'FORM 1', '24/09/2026', 'PS ACK AND FORM 1 NOT SENT TO INVENTOR'],
  ['AR690', 'FORM 1', '24/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR770', 'FORM 1', '24/09/2026', 'Signed form-1 not received from inventor'],
  ['AR780', 'FORM 1', '24/09/2026', 'Signed form-1 not received from inventor'],
  ['AAIS38', 'RENEWAL', '25/09/2026', 'Patent Granted'],
  ['AR296', 'PS-CS', '26/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR297', 'PS-CS', '26/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR298', 'PS-CS', '26/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR317', 'PS-CS', '26/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR966', 'FORM 26', '26/09/2026', 'Filed'],
  ['AR982', 'FORM 26', '26/09/2026', 'Filed'],
  ['CD45', 'PS-CS', '26/09/2026', 'Awaiting for data'],
  ['CD52', 'PS-CS', '26/09/2026', 'Awaiting for data'],
  ['AR387', 'PS-CS', '27/09/2026', 'under drafting'],
  ['AR457', 'PS-CS', '27/09/2026', 'Filed'],
  ['AR479', 'PS-CS', '27/09/2026', 'Checklist sent on 28/08/2026'],
  ['AR688', 'FORM 1', '27/09/2026', 'Followup mail sent on 21/08/2026'],
  ['AR388', 'PS-CS', '28/09/2026', 'sepcific checklist on 28/08/2026, awaiting for response'],
  ['AR1013', 'FORM 26', '29/09/2026', 'Filed'],
  ['AR1014', 'FORM 26', '29/09/2026', 'Filed'],
  ['AR936', 'FORM 26', '29/09/2026', 'Filed'],
  ['AR980', 'FORM 26', '29/09/2026', 'Filed'],
  ['AR1017', 'FORM 26', '30/09/2026', 'Filed'],
  ['AR186', 'PS-CS', '30/09/2026', 'Due to issue not proceded further, inventor sent data'],
  ['AR222', 'PS-CS', '30/09/2026', 'Followup mail sent on 21/08/2026'],
  ['SP02', 'PS-CS', '30/09/2026', 'Awaiting data'],
  ['SCEM03', 'FORM 3', '30/09/2026', 'Filed'],
];

function makeCol(headers) {
  return (row, name) => {
    const idx = headers.indexOf(name);
    return idx === -1 ? '' : (row[idx] ?? '');
  };
}

// Returns the ISO due_date this (code, dueType) currently resolves to in
// the live sheet, or null with a reason if it can't be resolved.
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
