// October "issue" batch. Same pattern as importIssue.js (September) —
// drops any row whose live deadline has moved out of October 2026.
//
// Usage:
//   node scripts/importIssueOct.js          -> dry run
//   node scripts/importIssueOct.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, HEARING_COL, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, parseDate, toISO } = require('../dueLogic');

// [code, dueType, note]
const ROWS = [
  ['MCODS08', 'PS-CS', 'Preview issue: Address of service reflected as MADHAV NAGAR, MANIPAL, 576104, KARNATAKA, INDIA'],
  ['AR329', 'PS-CS', 'Other issue: There is no Fig mentioned in Abstract (F2'],
  ['MCODS20', 'PS-CS', 'Preview issue: Inventor name reflected as APARNA I NAPARNA I N insted of APARNA I N'],
  ['AR467', 'PS-CS', 'Preview issue: Pincode for one of the inventor is wrong'],
  ['AR265', 'PS-CS', 'Portal issue: date of Filing is mentioned wrong in f5 preview / Other issue: 1.While Uploading form 5 Affiliation of Last 2 Inventors include both personal & MAHE Address, But in form 1 it contains only MAHE Affiliation ( difference in affiliation of last 2 Inventors in form 5 2.In F2, year mistake, 2925 instead of 2025'],
  ['AR324', 'PS-CS', 'Other issue: While Uploading form 5 Affiliation of Last 2 Inventors include both personal & MAHE Address, But in form 1 it contains only MAHE Affiliation ( difference in affiliation of last 2 Inventors in form 5'],
  ['AR10', 'FORM 3', 'Other issue: In F28, the date is mismatched with other forms'],
  ['AR494', 'PS-CS', 'Other issue: Fig 2 is not mentioned in the drawings'],
  ['AR1024', 'FORM 26', 'Other issue: Fig 3 is not mentioned in the Drawings'],
  ['AR343', 'PS-CS', 'Other issue: Page nos not mentioned in F2, and Page no os PS mentioned 14 instead of 13'],
  ['MI36', 'PS-CS', 'Portal issue: Addition of inventor not reflected in preview, form 13 is filed on 01/12/2025'],
  ['AR168', 'PS-CS', "Preview issue: One of the inventors' affiliations is wrongly mentioned in the preview (Vytla Ramachandra Murthy {F1 and F5 have different addresses}"],
  ['PH44', 'PS-CS', 'Preview issue: Inventor name 2 time reflected in the preview as RAGHU CHANDRASHEKAR HRAGHU CHANDRASHEKAR H instead of RAGHU CHANDRASHEKAR H'],
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

  const inOct = [];
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
    if (y === 2026 && m === 10) inOct.push(entry);
    else dropped.push(entry);
  }

  console.log(`In October 2026: ${inOct.length}`);
  console.log(`Dropped (postdated/moved): ${dropped.length}`);
  console.log(`Unresolved: ${unresolved.length}\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.note}" -> ${u.reason}`));
    console.log('');
  }

  if (dropped.length) {
    console.log('--- DROPPED (live deadline not in October 2026) ---');
    dropped.forEach((d) => console.log(`${d.code} | ${d.dueType} | live ${d.dueDate} | "${d.note}"`));
    console.log('');
  }

  console.log('--- WOULD WRITE ---');
  inOct.forEach((r) => console.log(`${r.code} | ${r.dueType} | ${r.dueDate} | "${r.note}"`));

  if (!apply) {
    console.log('\nDry run only — no DB writes. Re-run with --apply to write.');
    return;
  }

  console.log('\nApplying...');
  let written = 0;
  for (const r of inOct) {
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
