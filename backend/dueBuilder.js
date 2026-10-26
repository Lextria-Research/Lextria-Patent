const {
  isAbsent, isFormulaError, parseDate, toISO,
  DUE_TYPES, RENEWAL_PENDING_COL, RENEWAL_DONE_COL, HEARING_COL, WS_FILED_COL,
} = require('./dueLogic');
const { fieldStatus, rfeDeadlineFor } = require('./f9f18Check');

// These three due types always go to the same person — fixed, not
// editable per due, regardless of anything saved in due_entries.
const FIXED_ASSIGNEES = {
  HEARING: 'pranav bhat',
  RENEWAL: 'Paralegal',
  'WRITTEN SUBMISSION': 'Anusha',
};

// FER and F3 have no drafter in LR — a senior assigns them by hand.
const MANUAL_ASSIGN_TYPES = ['FER', 'FORM 3'];

function resolveAssignee(type, saved, lrName) {
  if (FIXED_ASSIGNEES[type]) return FIXED_ASSIGNEES[type];
  if (saved && saved.assigned_to) return saved.assigned_to;
  return MANUAL_ASSIGN_TYPES.includes(type) ? '' : lrName;
}

function makeCol(headers) {
  return (row, name) => {
    const idx = headers.indexOf(name);
    return idx === -1 ? '' : (row[idx] ?? '');
  };
}

// Collect unique names from the LR Sheet's "Assigned to" column
function collectAssignees(dataRows, col) {
  const assigneeSet = new Set();
  dataRows.forEach((row) => {
    const name = (col(row, 'Assigned to ') || col(row, 'Assigned to') || '').trim();
    if (name && name.toLowerCase() !== 'not assigned') assigneeSet.add(name);
  });
  return [...assigneeSet].sort();
}

// Builds every due occurrence from the LR Sheet rows whose date matches
// `includeDate`. This is the one place per-type deadline/status/assignee
// rules live — every caller (a single month, or every overdue due ever)
// goes through here so the rules can't drift between them.
function buildDues(dataRows, headers, {
  today, getSaved, includeDate, abandonedFlags = [],
}) {
  const col = makeCol(headers);
  const dues = [];
  const dataIssues = [];

  dataRows.forEach((row, rowIndex) => {
    const code = col(row, 'Code');
    if (isAbsent(code)) return;

    // abandonedFlags is index-aligned with the raw sheet rows (header at 0);
    // dataRows is that same array with the header sliced off.
    const isAbandoned = Boolean(abandonedFlags[rowIndex + 1]);

    // A formula error (e.g. #NUM!) is treated the same as blank rather
    // than shown literally.
    const rawPostDate = col(row, 'Remaining Post-Date Months');

    const base = {
      code,
      applicationNumber: String(col(row, 'Application Number') || ''),
      title: col(row, 'Title'),
      applicantName: col(row, 'Applicant Name'),
      inventorName: col(row, 'Inventor Name'),
      department: col(row, 'INVENTOR Institution'),
      inventorEmail: col(row, 'Inventor Email'),
      phoneNumber: String(col(row, 'Phone No.') || ''),
      postDateMonths: isFormulaError(rawPostDate) ? '' : rawPostDate,
      assignedTo: col(row, 'Assigned to ') || col(row, 'Assigned to'),
      f1Status: String(col(row, 'F1 Delayed by') || ''),
      f26Status: String(col(row, 'F26 Delayed by') || ''),
      isAbandoned,
    };

    // --- Standard due types ---
    DUE_TYPES.forEach(({ type, deadlineCol, completionCol }) => {
      const rawDeadline = col(row, deadlineCol);

      if (isFormulaError(rawDeadline)) {
        dataIssues.push({
          ...base, dueType: type, sourceColumn: deadlineCol,
          rawValue: String(rawDeadline), problem: 'formula_error',
        });
        return;
      }
      if (isAbsent(rawDeadline)) return;

      const deadline = parseDate(rawDeadline);
      if (!deadline) {
        dataIssues.push({
          ...base, dueType: type, sourceColumn: deadlineCol,
          rawValue: String(rawDeadline), problem: 'unparseable_date',
        });
        return;
      }
      if (!includeDate(deadline)) return;

      const rawCompletion = col(row, completionCol);
      const completion = isAbsent(rawCompletion) ? null : parseDate(rawCompletion);

      let status;
      if (completion) status = 'completed';
      else if (deadline < today) status = 'overdue';
      else status = 'pending';

      const deadlineISO = toISO(deadline);
      const saved = getSaved(code, type, deadlineISO);

      dues.push({
        ...base, dueType: type,
        assignedTo: resolveAssignee(type, saved, base.assignedTo),
        deadline: deadlineISO,
        completionDate: completion ? toISO(completion) : null,
        status,
        manual: saved,
      });
    });

    // --- RENEWAL: two separate dates, not deadline+completion ---
    const rawNext = col(row, RENEWAL_PENDING_COL);
    if (!isAbsent(rawNext)) {
      const next = parseDate(rawNext);
      if (!next) {
        dataIssues.push({
          ...base, dueType: 'RENEWAL', sourceColumn: RENEWAL_PENDING_COL,
          rawValue: String(rawNext), problem: 'unparseable_date',
        });
      } else if (includeDate(next)) {
        const nextISO = toISO(next);
        const savedNext = getSaved(code, 'RENEWAL', nextISO);
        dues.push({
          ...base, dueType: 'RENEWAL',
          assignedTo: resolveAssignee('RENEWAL', savedNext, base.assignedTo),
          deadline: nextISO, completionDate: null,
          status: next < today ? 'overdue' : 'pending',
          manual: savedNext,
        });
      }
    }

    const rawDone = col(row, RENEWAL_DONE_COL);
    if (!isAbsent(rawDone)) {
      const done = parseDate(rawDone);
      if (done && includeDate(done)) {
        const doneISO = toISO(done);
        const savedDone = getSaved(code, 'RENEWAL', doneISO);
        dues.push({
          ...base, dueType: 'RENEWAL',
          assignedTo: resolveAssignee('RENEWAL', savedDone, base.assignedTo),
          deadline: doneISO, completionDate: doneISO,
          status: 'completed',
          manual: savedDone,
        });
      }
    }

    // --- HEARING: manual status overrides WS-filed logic ---
    const rawHearing = col(row, HEARING_COL);
    if (!isAbsent(rawHearing)) {
      const hearing = parseDate(rawHearing);
      if (hearing && includeDate(hearing)) {
        const deadlineISO = toISO(hearing);
        const rawWs = col(row, WS_FILED_COL);
        const wsFiled = isAbsent(rawWs) ? null : parseDate(rawWs);
        const saved = getSaved(code, 'HEARING', deadlineISO);
        const hearingPassed = hearing < today;

        // A person may set the status ONLY when the hearing date has passed
        // and no WS has been filed. Otherwise it is decided automatically.
        const canSetStatus = !wsFiled && hearingPassed;

        let status;
        if (wsFiled) {
          status = 'completed';                     // WS filed -> done
        } else if (!hearingPassed) {
          status = 'pending';                       // not due yet
        } else if (saved && saved.status) {
          status = saved.status;                    // set by a person
        } else {
          status = 'pending';                       // awaiting a decision
        }

        dues.push({
          ...base, dueType: 'HEARING',
          assignedTo: resolveAssignee('HEARING', saved, base.assignedTo),
          deadline: deadlineISO,
          completionDate: wsFiled ? toISO(wsFiled) : null,
          status,
          canSetStatus,
          manual: saved,
        });
      }
    }

    // --- FORM 18 (RFE): no deadline column in the sheet — computed the
    // same way as the F9/F18 check, from the priority date (PS if filed,
    // else CS). Not eligible until CS is filed, same as that check, and
    // skipped for abandoned applications (they have no further deadline).
    if (!isAbandoned) {
      const rawCs = col(row, 'Date of filing (CS)');
      const csStatus = fieldStatus(rawCs);
      if (csStatus === 'FILED') {
        const rawPs = col(row, 'date of filing (PS)');
        const psStatus = fieldStatus(rawPs);
        const csFilingDate = parseDate(rawCs);
        const priorityDate = psStatus === 'FILED' ? (parseDate(rawPs) || csFilingDate) : csFilingDate;

        if (priorityDate) {
          const deadline = rfeDeadlineFor(priorityDate);
          if (includeDate(deadline)) {
            const rawCompletion = col(row, 'Form-18/18A date of filing');
            const completion = isAbsent(rawCompletion) ? null : parseDate(rawCompletion);

            let status;
            if (completion) status = 'completed';
            else if (deadline < today) status = 'overdue';
            else status = 'pending';

            const deadlineISO = toISO(deadline);
            const saved = getSaved(code, 'FORM 18', deadlineISO);

            dues.push({
              ...base, dueType: 'FORM 18',
              assignedTo: resolveAssignee('FORM 18', saved, base.assignedTo),
              deadline: deadlineISO,
              completionDate: completion ? toISO(completion) : null,
              status,
              manual: saved,
            });
          }
        }
      }
    }
  });

  return { dues, dataIssues };
}

module.exports = {
  buildDues, makeCol, collectAssignees,
  resolveAssignee, FIXED_ASSIGNEES, MANUAL_ASSIGN_TYPES,
};
