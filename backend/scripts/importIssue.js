// September "issue" batch. Same pattern as the other importers, writing
// to due_entries.issue. Per the user's call, any row whose live deadline
// has drifted out of September is dropped (same postdate-skip rule used
// for the status_notes/suggested_action batches).
//
// Usage:
//   node scripts/importIssue.js          -> dry run
//   node scripts/importIssue.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, HEARING_COL, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, parseDate, toISO } = require('../dueLogic');

// [code, dueType, note]
const ROWS = [
  ['AR441', 'PS-CS', 'Other issue: Date mismatch in uploaded Form 1 And all ather 6 Documnts dates are same.'],
  ['AAIS113', 'FORM 1', 'Preview issue: applicat affiliation mismatch It should be like this: CANARA ENGINEERING COLLEGE, SUDHINDRA NAGARA, BENJANAPADAVU, BANTWAL TALUK, MANGALURU-574219 BUT it is: SUDHINDRA NAGARA, BENJANAPADAVU, BANTWAL, MANGALORE, KARNATAKA, INDIA-574219'],
  ['CC01', 'FORM 1', 'Preview issue: applicat affiliation mismatch : It should be like this: CANARA ENGINEERING COLLEGE, SUDHINDRA NAGARA, BENJANAPADAVU, BANTWAL TALUK, MANGALURU-574219 BUT It is: SUDHINDRA NAGARA, BENJANAPADAVU, BANTWAL, MANGALORE, KARNATAKA, INDIA-574219.'],
  ['AR468', 'FORM 1', 'Preview issue: applicant affiliation mismatch, it is: MANIPAL ACADEMY OF HIGHER EDUCATION instead of: MADHAV NAGAR, MANIPAL, 576104, KARNATAKA, INDIA'],
  ['SP29', 'PS-CS', 'Preview issue: In preview, the inventor\'s name (Siddeshwar P Khule address is mentioned as "SIDDESHWAR P KHULE Ph D Research Scholar, Department of Basic Medical Science, MMMC, Manipal Academy of Higher Education, Manipal, Karnataka, India-576104"'],
  ['AR403', 'PS-CS', 'Portal issue: FORM 13 filed for change in affiliation, but preview still shown old affilation only(CS not done yet'],
  ['AR445', 'PS-CS', 'Preview issue: There are 6 inventors in Form 1 only 5 inventors there in preview(Archana Rao'],
  ['AAIS111', 'PS-CS', 'Other issue: While filing Forms in initial stage Form 5 uploaded 2 times.'],
  ['AR188', 'PS-CS', 'Other issue: Abandon status in patent search'],
  ['AR281', 'PS-CS', 'Other issue: Abandon status in patent search'],
  ['CD58', 'PS-CS', 'Other issue: Abandon status in patent search'],
  ['MI134', 'FORM 1', "Other issue: In Form1 preview, uploaded drawings document don't have Pranav Sir's signature."],
  ['MI90', 'FORM 1', 'Other issue: Form 1 in portal shows Complete specifications, actully its PS'],
  ['SP35', 'PS-CS', 'Other issue: 1.on sept 16 2025 inventor asked for status saying that application is awaiting complete specification 2. we have sent checklist on the same date saying sionce the application PS we need data to proceed for CS 3.but ignoring the mail inventor again reverted asking the status of application on 10/12/2025 to office mail 4. followup done on 12/05/2026.'],
  ['AR476', 'PS-CS', 'Other issue: In Form 1 uploaded document, date is mismatched'],
  ['AR927', 'FORM 26', 'Other issue: In Form 1, In the page number table for drawings no. of drawings and no of pages mismatch'],
  ['AAIS166', 'FORM 26', 'Other issue: in form2, page no is missing'],
  ['AR360', 'PS-CS', 'Other issue: In Form 1, the signature date is mismatched'],
  ['AR310', 'PS-CS', 'Other issue: In drawings, "Fig 9A" is mentioned instead of "Fig1"'],
  ['AR770', 'FORM 1', 'Other issue: In drawings, "Fig4" is mentioned instead of "Fig2"'],
  ['CD52', 'PS-CS', 'Preview issue: The country of residence for inventor named Tarun Mateti is incorrectly displayed as USA in the portal preview. The correct country of residence is India. (Form1 preview'],
  ['SP06', 'PS-CS', 'Preview issue: In preview Inventor name is mentioned as "PROFESSOR & UNIT CHIEF, DEPARTMENT OF OBSTETRICS AND GYNECOLOGY AT MMMC, MANIPAL ACADEMY OF HIGHER EDUCATION, MANIPAL, KARNATAKA, INDIA-576104" instead of inventor name( KRISHNARAJ CHADAGA CS yet to be filed'],
  ['AR387', 'PS-CS', 'Preview issue: Inventor named DEEPTHI PARAJ is mentioned as DEEPTHI PARAJI in preview(CS not done yet, One of the inventor country is mentioned wrong in preview'],
  ['AR457', 'PS-CS', 'Preview issue: Inventor named SHIVAM THAKER country is mentioned as USA instead of INDIA but in uploaded forms preview it is correctly shown as INDIA'],
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

  const inSept = [];
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
    if (y === 2026 && m === 9) inSept.push(entry);
    else dropped.push(entry);
  }

  console.log(`In September 2026: ${inSept.length}`);
  console.log(`Dropped (postdated/moved): ${dropped.length}`);
  console.log(`Unresolved: ${unresolved.length}\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.note}" -> ${u.reason}`));
    console.log('');
  }

  if (dropped.length) {
    console.log('--- DROPPED (live deadline not in September 2026) ---');
    dropped.forEach((d) => console.log(`${d.code} | ${d.dueType} | live ${d.dueDate} | "${d.note}"`));
    console.log('');
  }

  console.log('--- WOULD WRITE ---');
  inSept.forEach((r) => console.log(`${r.code} | ${r.dueType} | ${r.dueDate} | "${r.note}"`));

  if (!apply) {
    console.log('\nDry run only — no DB writes. Re-run with --apply to write.');
    return;
  }

  console.log('\nApplying...');
  let written = 0;
  for (const r of inSept) {
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
