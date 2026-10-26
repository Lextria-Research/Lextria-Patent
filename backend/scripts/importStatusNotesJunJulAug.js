// June/July/August status-notes batch. Unlike the September/October
// batches, this pasted list was NOT cleanly confined to those months —
// many rows' live deadlines resolve to Jan/Apr/Sep/Oct/Nov/Dec 2026 or
// even Feb 2027. Per the user's call, this script keeps ONLY rows whose
// LIVE resolved due_date falls in June, July or August 2026 — everything
// else (postdated items, and rows that would collide with the
// already-imported Sept/Oct batches) is dropped automatically by that
// same rule, since their live deadline isn't in this window.
//
// "NA" notes are treated the same as blank — skipped, not written.
//
// Usage:
//   node scripts/importStatusNotesJunJulAug.js          -> dry run
//   node scripts/importStatusNotesJunJulAug.js --apply   -> actually writes

const pool = require('../db');
const sheetCache = require('../sheetCache');
const { DUE_TYPES, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, HEARING_COL, parseDate, toISO } = require('../dueLogic');

const TYPE_ALIASES = {
  'WRITTEN SUBMISSON': 'WRITTEN SUBMISSION',
};

const SKIP_NOTES = new Set(['na']);

// [code, dueType, pastedDate(DD/MM/YYYY), note]
const ROWS = [
  ['SCEM09', 'FER', '06/01/2026', 'Filed'],
  ['MI31', 'FORM 1', '06/01/2026', 'FILED'],
  ['AR48', 'PS-CS', '06/01/2026', 'Awaiting for data / REFILING'],
  ['CH21', 'FORM 1', '06/03/2026', 'change in affiliaaition asked for an inventor sent to lextria office mail we have not responeded and checklist not sent'],
  ['SP15', 'PS-CS', '06/04/2026', 'draft sent to inventor review with additonal comments to the inventor'],
  ['CH01', 'PS-CS', '06/04/2026', 'awaiting for data'],
  ['CH02', 'PS-CS', '06/04/2026', 'awaiting for data'],
  ['CH03', 'PS-CS', '06/04/2026', 'awaiting for data'],
  ['CD56', 'PS-CS', '06/04/2026', 'Awaiting for data'],
  ['AR198', 'PS-CS', '06/04/2026', 'PS filed , checklist not sent'],
  ['MB26', 'PS-CS', '06/04/2026', 'Awaiting for data'],
  ['SCEM13', 'FER', '06/04/2026', 'FILED'],
  ['AAIS112', 'FORM 26', '06/04/2026', 'FILED'],
  ['AAIS113', 'FORM 26', '06/04/2026', 'FILED'],
  ['CC01', 'FORM 26', '06/04/2026', 'FILED'],
  ['CC02', 'FORM 26', '06/04/2026', 'FILED'],
  ['AAIS73', 'PS-CS', '06/04/2026', 'Check list sent'],
  ['HP07', 'FORM 1', '06/05/2026', 'checklist sent, awaiting data / Filed'],
  ['MI49', 'FORM 1', '06/05/2026', 'awaiting for data'],
  ['SP18', 'PS-CS', '06/06/2026', 'Awaiting for data'],
  ['CD18', 'PS-CS', '06/06/2026', 'Refiling'],
  ['PH10', 'PS-CS', '06/06/2026', 'Awiaiting for data'],
  ['CD21', 'PS-CS', '06/06/2026', 'Filed'],
  ['AR59', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR50', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR51', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR52', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR60', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR61', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR62', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['AR63', 'PS-CS', '06/06/2026', 'checklist not sent / REFILING'],
  ['SP19', 'PS-CS', '06/07/2026', 'Awaiting for data'],
  ['CD08', 'PS-CS', '06/09/2026', 'Awaiting for data'],
  ['SP29', 'PS-CS', '06/09/2026', 'Awaiting for data'],
  ['AR56', 'PS-CS', '06/09/2026', 'checklist not sent / checklist not sent / REFILING'],
  ['AR169', 'PS-CS', '06/09/2026', 'Validataion data not Provided'],
  ['AR468', 'FORM 1', '06/09/2026', 'Awaiting for data'],
  ['CD60', 'FORM 1', '06/09/2026', 'Awaiting Form-1'],
  ['AR53', 'PS-CS', '06/09/2026', 'checklist not sent / REFILING'],
  ['AR54', 'PS-CS', '06/09/2026', 'checklist not sent / REFILING'],
  ['AAIS79', 'PS-CS', '06/09/2026', 'checklist not sent'],
  ['AAIS80', 'PS-CS', '06/09/2026', 'checklist not sent'],
  ['AAIS81', 'PS-CS', '06/09/2026', 'checklist not sent'],
  ['AAIS82', 'PS-CS', '06/09/2026', 'checklist not sent'],
  ['DA24', 'PS-CS', '06/10/2026', 'Awaiting for data'],
  ['AR55', 'PS-CS', '06/10/2026', 'checklist not sent / REFILING'],
  ['AR617', 'FORM 1', '06/10/2026', 'Awaiting for Signed F1 / Filed'],
  ['AR618', 'FORM 1', '06/10/2026', 'Awaiting for Signed F1 / Filed'],
  ['AR619', 'FORM 1', '06/10/2026', 'Awaiting for Signed F1 / Filed'],
  ['AR620', 'FORM 1', '06/10/2026', 'Awaiting for Signed F1 / Filed'],
  ['AR621', 'FORM 1', '06/10/2026', 'Awaiting for Signed F1 / Filed'],
  ['AR535', 'FORM 1', '06/11/2026', 'Form-1 recieved'],
  ['AR583', 'FORM 1', '06/11/2026', 'draft sent for inventor review / Filed'],
  ['CD14', 'FORM 1', '06/11/2026', 'Awaiitng for signed F1'],
  ['MB01', 'FORM 1', '06/11/2026', 'F1 recieved, awaiting for NOC / filed'],
  ['MN02', 'FORM 1', '06/11/2026', 'FILED'],
  ['CD42', 'PS-CS', '06/12/2026', 'Filed'],
  ['AR588', 'FORM 1', '06/12/2026', 'Form-1 recieved / Filed'],
  ['AR607', 'FORM 1', '06/12/2026', 'Form-1 recieved / Filed'],
  ['MI126', 'FORM 1', '06/12/2026', 'Form-1 recieved / Filed'],
  ['MI136', 'FORM 1', '06/12/2026', 'Awaiting for signed F1'],
  ['MI43', 'FORM 1', '06/12/2026', 'Awaiting for signed F1 / Filed'],
  ['MI72', 'FORM 1', '06/12/2026', 'Awaiting for signed F1 / Filed'],
  ['MN01', 'FORM 1', '06/12/2026', 'Awaiting for signed F1 / Filed'],
  ['PH62', 'FORM 1', '06/12/2026', 'Awaiting for signed F1 / Filed'],
  ['SJEC21', 'PS-CS', '06/12/2026', 'Checklist not sent'],
  ['MI144', 'FORM 1', '13/06/2026', 'Awaiting for signed F1'],
  ['MI59', 'FORM 1', '13/06/2026', 'Form-1 recieved / Filed'],
  ['MI60', 'FORM 1', '13/06/2026', 'Filed'],
  ['MI69', 'FORM 1', '13/06/2026', 'awaiting for signed Form-1'],
  ['MI76', 'FORM 1', '13/06/2026', 'awaiting for data / Filed'],
  ['CD25', 'PS-CS', '14/06/2026', 'Awaiting for data'],
  ['AR69', 'PS-CS', '14/06/2026', 'Awaiiting for data'],
  ['MI100', 'FORM 1', '14/06/2026', 'chceklist not sent / Filed'],
  ['MI71', 'FORM 1', '14/06/2026', 'Form-1 received'],
  ['MI82', 'FORM 1', '14/06/2026', 'NA'],
  ['AR225', 'PS-CS', '15/06/2026', 'Filed'],
  ['MI139', 'FORM 1', '15/06/2026', 'Checklist not sent'],
  ['MI84', 'FORM 1', '15/06/2026', 'checklist not sent / follow up not done'],
  ['AR241', 'PS-CS', '15/06/2026', 'Filed'],
  ['PH72', 'FORM 1', '15/06/2026', 'Filed'],
  ['CH19', 'PS-CS', '17/06/2026', 'Awaiting for data'],
  ['AR82', 'PS-CS', '17/06/2026', 'filed'],
  ['CH09', 'PS-CS', '18/06/2026', 'Awaiting for data'],
  ['AR533', 'FORM 1', '18/06/2026', 'Filed'],
  ['MI131', 'FORM 1', '18/06/2026', 'Awaiting signed Form-1'],
  ['MI137', 'FORM 1', '18/06/2026', 'Awaiting signed Form-1'],
  ['CD46', 'PS-CS', '19/06/2026', 'Filed'],
  ['AR67', 'PS-CS', '19/06/2026', 'Filed'],
  ['AR83', 'PS-CS', '19/06/2026', 'filed'],
  ['AR118', 'PS-CS', '21/06/2026', 'Awaiting for data'],
  ['AR121', 'PS-CS', '21/06/2026', 'Awaiting for data'],
  ['CD15', 'PS-CS', '21/06/2026', 'CHECKLIST SENT ON 3/11/2025 NO DATA RECIEVED'],
  ['CMRIT01', 'FER', '22/06/2026', 'FILED'],
  ['AR153', 'PS-CS', '23/06/2026', 'FILED'],
  ['PH45', 'PS-CS', '23/06/2026', 'Awaiting for data'],
  ['AR120', 'PS-CS', '23/06/2026', 'Awaiting for data'],
  ['AR123', 'PS-CS', '23/06/2026', 'Awaiting for data'],
  ['AR124', 'PS-CS', '23/06/2026', 'Awaiting for data'],
  ['AR125', 'PS-CS', '23/06/2026', 'Awaiting for data'],
  ['DSU02', 'HEARING', '23/06/2026', 'NA'],
  ['BR10', 'PS-CS', '24/06/2026', 'Awaiting for data'],
  ['BR15', 'PS-CS', '24/06/2026', 'Awaiting for data'],
  ['AR292', 'PS-CS', '25/06/2026', 'CS sent for inventor review on 03 May / Filed'],
  ['CH10', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['PH08', 'PS-CS', '26/06/2026', 'requested to withdraw'],
  ['AR97', 'PS-CS', '26/06/2026', 'Awaiitng for data'],
  ['AR136', 'PS-CS', '26/06/2026', 'Filed'],
  ['AR94', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR95', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR96', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR99', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR100', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR122', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR126', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR128', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR129', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR131', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR154', 'PS-CS', '26/06/2026', 'Awaiting for data'],
  ['AR157', 'PS-CS', '27/06/2026', 'Awaiting for data'],
  ['CD24', 'PS-CS', '27/06/2026', 'Awaiting for data'],
  ['AR93', 'PS-CS', '27/06/2026', 'Awaiting for data'],
  ['AR186', 'PS-CS', '30/06/2026', 'awaiting data'],
  ['AR202', 'PS-CS', '30/06/2026', 'awaiting data'],
  ['AR208', 'PS-CS', '30/06/2026', 'awaiting data'],
  ['AR210', 'PS-CS', '30/06/2026', 'under confirmation of the inventor'],
  ['AR644', 'FORM 1', '30/06/2026', 'ticket raised and form 1 filed'],
  ['AR659', 'FORM 1', '30/06/2026', 'Filed'],
  ['AR660', 'FORM 1', '30/06/2026', 'filed'],
  ['AR661', 'FORM 1', '30/06/2026', 'filed'],
  ['AR665', 'FORM 1', '30/06/2026', 'Awaiting for signed F1 / treated as abandonment mail'],
  ['AR666', 'FORM 1', '30/06/2026', 'Awaiting for signed F1 / treated as abandonment mail'],
  ['AR667', 'FORM 1', '30/06/2026', 'Awaiting for signed F1 / treated as abandonment mail'],
  ['AR669', 'FORM 1', '30/06/2026', 'Awaiting for signed F1 / treated as abandonment mail'],
  ['DH09', 'FORM 1', '01/07/2026', 'Form 1 filed'],
  ['AR224', 'PS-CS', '01/07/2026', 'Follow-up done on 25/06/2026'],
  ['AR302', 'PS-CS', '01/07/2026', 'CS FILED'],
  ['AR135', 'PS-CS', '01/07/2026', 'Awaiting for data'],
  ['AAIS59', 'PS-CS', '01/07/2026', 'Awaiting for data'],
  ['CMRIT04', 'RENEWAL', '01/07/2026', 'filed'],
  ['CD09', 'PS-CS', '02/07/2026', 'refilingRERILING'],
  ['SP26', 'PS-CS', '02/07/2026', 'RESOLVED'],
  ['PRS03', 'FER', '02/07/2026', 'FILED'],
  ['AR328', 'PS-CS', '05/07/2026', 'Checklist sent; data not received / follow-up done on 23/06/2026'],
  ['AR222', 'PS-CS', '05/07/2026', 'CS sent, awaiting for response for comments (limiting parameters)'],
  ['AR329', 'PS-CS', '05/07/2026', 'Checklist sent; data not received Checklist sent; data not received / follow-up done on 23/06/2026'],
  ['MI104', 'FORM 1', '05/07/2026', 'checklist not sent'],
  ['AR623', 'FORM 1', '05/07/2026', 'FILED'],
  ['AR616', 'FORM 1', '05/07/2026', 'Form 1 follow up mail sent on 04/07/2026'],
  ['AR615', 'FORM 1', '05/07/2026', 'Form 1 follow up mail sent on 04/07/2026'],
  ['DSU02', 'WRITTEN SUBMISSON', '07/07/2026', 'FILED'],
  ['AR324', 'PS-CS', '09/07/2026', '1.Awaiting for data / 2.there is no futher information about the meeting held between pratham and inventor'],
  ['AR321', 'PS-CS', '11/07/2026', 'PS filed and Checlist not sent'],
  ['SP32', 'PS-CS', '11/07/2026', 'Awaiting for data'],
  ['SJEC21', 'PS-CS', '12/07/2026', 'Checklist sent'],
  ['AAIS99', 'PS-CS', '12/07/2026', 'PS filed and checklist not sent'],
  ['SP02', 'PS-CS', '14/07/2026', 'awaiting data'],
  ['AR337', 'PS-CS', '14/07/2026', 'Empirical data sent; no confirmation received / NO ACTION'],
  ['AR220', 'PS-CS', '14/07/2026', 'PS filed and Checlist not sent'],
  ['AR221', 'PS-CS', '14/07/2026', 'specififc Checklist sent; no data receive'],
  ['MI109', 'FORM 1', '14/07/2026', 'checklist not sent / FILED'],
  ['MI80', 'FORM 1', '14/07/2026', 'checklist not sent'],
  ['AR629', 'FORM 1', '14/07/2026', 'filed'],
  ['AR624', 'FORM 1', '14/07/2026', 'checklist not sent / FILED'],
  ['PH38', 'PS-CS', '15/07/2026', 'PS filed and Checlist not sent'],
  ['PH37', 'PS-CS', '15/07/2026', 'PS filed and Checlist sent but data not received'],
  ['AAIS61', 'PS-CS', '15/07/2026', 'CS draft confirmed by inventor / FILED'],
  ['PH11', 'PS-CS', '16/06/2026', 'AWAITING DATA WITH ISSUE'],
  ['AR158', 'PS-CS', '16/07/2026', 'Awaiting for data'],
  ['SP20', 'PS-CS', '16/07/2026', 'Awaiting for data'],
  ['MB20', 'PS-CS', '17/07/2026', 'checklist sent'],
  ['AR348', 'PS-CS', '17/07/2026', 'PUBLISHED / FILED'],
  ['SJEC23', 'PS-CS', '17/07/2026', 'checklist not sent'],
  ['AR323', 'PS-CS', '22/07/2026', 'PS filed and Checlist not sent'],
  ['AR308', 'PS-CS', '22/07/2026', 'awaiting data'],
  ['AR344', 'PS-CS', '22/07/2026', 'checklist not sent'],
  ['AR167', 'PS-CS', '22/07/2026', 'Awaiting for data'],
  ['MI36', 'PS-CS', '24/07/2026', 'awaiting data'],
  ['AR367', 'PS-CS', '24/07/2026', 'PS filed and Checlist not sent'],
  ['AR249', 'PS-CS', '24/07/2026', 'UNDER DRAFTING'],
  ['AAIS98', 'PS-CS', '24/07/2026', 'checklist not sent'],
  ['MI128', 'FORM 1', '24/07/2026', 'PS filed , F1 not received'],
  ['AR295', 'PS-CS', '25/07/2026', 'Draft sent with commets on 09/07/2026'],
  ['AR168', 'PS-CS', '25/07/2026', 'Awaiting for data'],
  ['AR205', 'PS-CS', '25/07/2026', 'Filed'],
  ['AR206', 'PS-CS', '25/07/2026', 'CS filed'],
  ['AR90', 'PS-CS', '25/07/2026', 'Awaiting for data'],
  ['DH03', 'PS-CS', '25/07/2026', 'Awaiting for data'],
  ['AAIS139', 'FORM 1', '25/07/2026', 'I have not created mail trail and ack was communicated by Sharan sir'],
  ['SP06', 'PS-CS', '26/07/2026', 'inventor is not giving complete data even after multiple followups'],
  ['CH04', 'PS-CS', '30/07/2026', 'Awaiting for data'],
  ['AAIS100', 'PS-CS', '31/07/2026', 'Checklist sent'],
  ['AR336', 'PS-CS', '01/02/2027', 'Awaiiting for data'],
  ['MP04', 'RENEWAL', '01/08/2026', 'Filed'],
  ['DH09', 'PS-CS', '01/08/2026', 'Awaiting data for CS / Ticket raised / Mail sent to IPO Help desk / abandoned'],
  ['AR365', 'PS-CS', '01/08/2026', 'Filed'],
  ['AR662', 'FORM 1', '02/08/2026', 'Filed'],
  ['AR110', 'FORM 1', '04/08/2026', 'Filed'],
  ['MP16', 'RENEWAL', '04/08/2026', 'Filed'],
  ['AR86', 'PS-CS', '05/08/2026', 'Abandoned mail sent on 15/07/2026'],
  ['AAIS135', 'FORM 1', '05/08/2026', 'PS filed From 1 not received'],
  ['MI09', 'PS-CS', '05/08/2026', 'data not received for complete specification / abandoned'],
  ['AR355', 'PS-CS', '06/11/2026', "PS filed , Awaitiing for data / Follwo-up done on 29/07/2026"],
  ['MI145', 'FORM 1', '06/08/2026', 'Not filed'],
  ['AAIS100', 'PS-CS', '07/08/2026', 'Checklist sent / RED'],
  ['AR295', 'PS-CS', '07/08/2026', 'Filed'],
  ['AR89', 'PS-CS', '07/08/2026', 'PS filed , awaiting for data / RED'],
  ['AR197', 'PS-CS', '16/12/2026', 'PS filed , checklsit not sent'],
  ['SJEC22', 'PS-CS', '08/08/2026', 'Abandoned by inventor / RED'],
  ['AR705', 'FORM 1', '08/08/2026', 'F1 received / FILED'],
  ['SCEM02', 'HEARING', '10/08/2026', 'Filed'],
  ['SP17', 'PS-CS', '11/08/2026', 'Filed'],
  ['AAIS99', 'PS-CS', '12/08/2026', 'Sir told to hold / NO ACTION'],
  ['AR388', 'PS-CS', '28/09/2026', 'PS filed and checklist not sent / Sir need to communicate'],
  ['AR251', 'PS-CS', '14/11/2026', 'Follow-up done on 09/07/2026 awaiting data'],
  ['SCEM13', 'WRITTEN SUBMISSON', '15/08/2026', 'Filed'],
  ['PH38', 'PS-CS', '15/08/2026', 'red'],
  ['PH37', 'PS-CS', '15/08/2026', 'red'],
  ['AR679', 'FORM 1', '16/08/2026', 'Not filed'],
  ['SCEM19', 'FER', '16/08/2026', 'Filed'],
  ['MB20', 'PS-CS', '17/09/2026', 'Follow-up done on 24/07/2026'],
  ['SP35', 'PS-CS', '18/08/2026', 'SIR MAILED ON 25/06/2026 to fill in the checklist; we have not heard back anything yet'],
  ['MI14', 'PS-CS', '19/08/2026', 'Abandoned'],
  ['AR692', 'FORM 1', '19/08/2026', 'F1 not received / Follow-up done on 29/07/2026 / PETETION MAIL SENT'],
  ['AAIS105', 'PS-CS', '19/11/2026', 'Last follow up mail on 17/08/2026 checklist sent / Awwaiting data'],
  ['CD03', 'PS-CS', '19/08/2026', 'abandoned'],
  ['AP04', 'PS-CS', '19/08/2026', 'ABANDONED'],
  ['AR389', 'PS-CS', '20/10/2026', 'Awaiting data'],
  ['AR405', 'PS-CS', '22/08/2026', 'FILED'],
  ['SP14', 'PS-CS', '22/08/2026', 'Drafted and sent to inventor / Sir need to communicate'],
  ['AR423', 'PS-CS', '22/08/2026', 'FILED'],
  ['AR739', 'FORM 26', '23/08/2026', 'FILED'],
  ['AR740', 'FORM 26', '23/08/2026', 'FILED'],
  ['AR242', 'PS-CS', '24/08/2026', 'Draft sent to inventor for confirmation on 4/07/2026; draft not yet confirmed / Filed'],
  ['AR228', 'PS-CS', '24/08/2026', 'Draft is in hold due to 3k issue'],
  ['AR223', 'PS-CS', '24/08/2026', 'Done multiple follow-ups. Last follow-up done on 09/07/2026, but no data received yet / Filed'],
  ['SJEC20', 'PS-CS', '24/09/2026', 'CHECKLIST SENT AWAITING DATA'],
  ['AR198', 'PS-CS', '25/09/2026', 'Awaiting for data / Pranav Sir need to communicate'],
  ['AR432', 'PS-CS', '26/08/2026', 'FILED'],
  ['AR861', 'FORM 26', '27/08/2026', 'FILED'],
  ['AR902', 'FORM 26', '27/08/2026', 'FILED'],
  ['MI73', 'FORM 1', '28/08/2026', 'filed'],
  ['AR456', 'PS-CS', '29/08/2026', 'Awaiting for data'],
  ['CD11', 'PS-CS', '31/08/2026', 'Follow-up done on 09/07/2026 but still awaiting data'],
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

  const inWindow = [];
  const outOfWindow = [];
  const unresolved = [];
  const skippedNa = [];

  for (const [code, rawType, pastedDate, note] of ROWS) {
    if (SKIP_NOTES.has(note.trim().toLowerCase())) {
      skippedNa.push({ code, dueType: rawType, note });
      continue;
    }
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
    const [y, m] = result.iso.split('-').map(Number);
    const entry = { code, dueType, dueDate: result.iso, pastedDate, note };
    if (y === 2026 && (m === 6 || m === 7 || m === 8)) {
      inWindow.push(entry);
    } else {
      outOfWindow.push(entry);
    }
  }

  // Detect same (code,dueType,dueDate) appearing twice within the kept set with different notes.
  // Per the user's call, conflicting keys are skipped entirely (neither note written),
  // not resolved by picking one — safer than guessing.
  const byKey = new Map();
  const conflictKeys = new Set();
  const conflicts = [];
  for (const r of inWindow) {
    const key = `${r.code}|${r.dueType}|${r.dueDate}`;
    if (byKey.has(key) && byKey.get(key).note !== r.note) {
      conflicts.push([byKey.get(key), r]);
      conflictKeys.add(key);
    }
    byKey.set(key, r);
  }

  console.log(`In June/July/Aug 2026 window: ${inWindow.length}`);
  console.log(`Out of window (dropped):     ${outOfWindow.length}`);
  console.log(`Skipped ("NA" notes):        ${skippedNa.length}`);
  console.log(`Unresolved:                  ${unresolved.length}`);
  console.log(`Within-batch conflicts:      ${conflicts.length} (both sides skipped)\n`);

  if (unresolved.length) {
    console.log('--- UNRESOLVED (not written, need review) ---');
    unresolved.forEach((u) => console.log(`${u.code} | ${u.dueType} | "${u.note}" -> ${u.reason}`));
    console.log('');
  }

  if (conflicts.length) {
    console.log('--- WITHIN-BATCH CONFLICTS (same due, two different notes — SKIPPED, neither written) ---');
    conflicts.forEach(([a, b]) => {
      console.log(`${a.code} | ${a.dueType} | ${a.dueDate}`);
      console.log(`   pasted@${a.pastedDate}: "${a.note}"`);
      console.log(`   pasted@${b.pastedDate}: "${b.note}"`);
    });
    console.log('');
  }

  console.log('--- DROPPED (out of window: not June/July/August 2026) ---');
  outOfWindow.forEach((r) => console.log(`${r.code} | ${r.dueType} | live ${r.dueDate} (pasted ${r.pastedDate}) | "${r.note}"`));

  console.log('\n--- WOULD WRITE (in window, conflicts excluded) ---');
  const finalRows = [...byKey.values()].filter((r) => !conflictKeys.has(`${r.code}|${r.dueType}|${r.dueDate}`));
  finalRows.forEach((r) => console.log(`${r.code} | ${r.dueType} | ${r.dueDate} | "${r.note}"`));

  if (!apply) {
    console.log(`\n${finalRows.length} row(s) would be written. Dry run only — no DB writes. Re-run with --apply to write.`);
    return;
  }

  console.log('\nApplying...');
  let written = 0;
  for (const r of finalRows) {
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
