const { isAbsent, parseDate, toISO } = require('./dueLogic');
const { makeCol } = require('./dueBuilder');
const { classifyMahe } = require('./patentClassification');

function isoOrBlank(value) {
  const parsed = parseDate(value);
  return parsed ? toISO(parsed) : '';
}

// The set of raw sheet rows whose Code cell is red. Keyed by the row array
// itself rather than by index so callers can filter/slice the rows (every
// tab drops blank-Code rows) without the flags falling out of alignment.
function abandonedRowSet(allRows, abandonedFlags) {
  const set = new Set();
  allRows.forEach((row, i) => {
    if (i > 0 && abandonedFlags[i]) set.add(row);
  });
  return set;
}

// Builds the Abandoned patents list: every LR Sheet row whose Code cell is
// filled red. `allRows` is the full row set (header first), index-aligned
// with `abandonedFlags`.
//
// How far an application got is read straight from the sheet's own STATUS
// column ("PS Filed - CS Not Filed", ...) rather than derived from the
// filing dates. STATUS says which form is missing, agrees with the dates on
// every row, and where it's blank the dates are too unreliable to guess
// from — so a blank stays blank instead of becoming an invented stage.
function buildAbandonedPatents(allRows, headers, abandonedFlags) {
  const col = makeCol(headers);

  return allRows
    .filter((row, i) => i > 0 && abandonedFlags[i] && String(col(row, 'Code')).trim() !== '')
    .map((row) => {
      // Same D.O.F. rule as Patent filed: once a CS exists it supersedes
      // the PS entirely. The two dates aren't exposed separately — only one
      // of them exists on all but a single abandoned row, so D.O.F. is that
      // date and the sheet's STATUS already says which kind it was.
      const dofDate = parseDate(col(row, 'Date of filing (CS)'))
        || parseDate(col(row, 'date of filing (PS)'));
      return {
        code: col(row, 'Code'),
        mahe: classifyMahe(col(row, 'Code')),
        title: col(row, 'Title'),
        applicantName: col(row, 'Applicant Name'),
        inventorName: col(row, 'Inventor Name'),
        applicationNumber: String(col(row, 'Application Number') || ''),
        status: col(row, 'STATUS'),
        dof: dofDate ? toISO(dofDate) : '',
        dateOfPublication: isoOrBlank(col(row, 'Date of Publication')),
        publicationNumber: col(row, 'Publication number'),
        form9Filed: isAbsent(col(row, 'Form-9 date of filing')) ? 'No' : 'Yes',
        form18Filed: isAbsent(col(row, 'Form-18/18A date of filing')) ? 'No' : 'Yes',
        dateOfGrant: isoOrBlank(col(row, 'Date of Grant')),
        assignedTo: col(row, 'Assigned to ') || col(row, 'Assigned to'),
      };
    });
}

module.exports = { buildAbandonedPatents, abandonedRowSet };
