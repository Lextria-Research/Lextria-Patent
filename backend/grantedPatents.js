const { isAbsent, parseDate, toISO } = require('./dueLogic');
const { makeCol } = require('./dueBuilder');
const { classifyMahe } = require('./patentClassification');

// Codes that share an application number with another granted-patent row
// (re-filed/duplicate LR entries) — confirmed by hand which one to keep.
const EXCLUDED_DUPLICATE_CODES = ['AAIS38', 'MP05', 'MP28'];

function isoOrRaw(value) {
  const parsed = parseDate(value);
  return parsed ? toISO(parsed) : '';
}

// Builds the Granted patents list: every LR Sheet row with a Date of Grant,
// minus the confirmed duplicates, mapped to the fields the tab shows.
// `today` drives the same overdue-renewal rule the Due dashboard/Overdue
// tabs use for a RENEWAL due (next renewal date already passed).
function buildGrantedPatents(dataRows, headers, today) {
  const col = makeCol(headers);

  return dataRows
    .filter((row) => !isAbsent(col(row, 'Date of Grant')))
    .filter((row) => !EXCLUDED_DUPLICATE_CODES.includes(col(row, 'Code')))
    .map((row) => {
      const nextRenewalDate = parseDate(col(row, 'Date of Next Renewal'));
      return {
        code: col(row, 'Code'),
        mahe: classifyMahe(col(row, 'Code')),
        applicationNumber: String(col(row, 'Application Number') || ''),
        title: col(row, 'Title'),
        applicantName: col(row, 'Applicant Name'),
        inventorName: col(row, 'Inventor Name'),
        dateOfFilingPS: isoOrRaw(col(row, 'date of filing (PS)')),
        dateOfFilingCS: isoOrRaw(col(row, 'Date of filing (CS)')),
        dateOfPublication: isoOrRaw(col(row, 'Date of Publication')),
        publicationNumber: col(row, 'Publication number'),
        dateOfGrant: isoOrRaw(col(row, 'Date of Grant')),
        dateOfRenewal: isoOrRaw(col(row, 'Date of Renewal')),
        nextRenewal: nextRenewalDate ? toISO(nextRenewalDate) : '',
        isRenewalOverdue: Boolean(nextRenewalDate && nextRenewalDate < today),
        assignedTo: col(row, 'Assigned to ') || col(row, 'Assigned to'),
      };
    });
}

module.exports = { buildGrantedPatents, EXCLUDED_DUPLICATE_CODES };
