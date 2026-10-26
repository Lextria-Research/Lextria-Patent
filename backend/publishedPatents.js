const { isAbsent, parseDate, toISO } = require('./dueLogic');
const { makeCol } = require('./dueBuilder');
const { classifyMahe, cleanInstitution } = require('./patentClassification');

// D.O.F. is the PS filing date when one exists, otherwise the CS filing
// date — Classification just labels which case applies.
function filingInfo(psRaw, csRaw) {
  const ps = parseDate(psRaw);
  if (ps) return { dof: toISO(ps), classification: 'PS to CS' };
  const cs = parseDate(csRaw);
  if (cs) return { dof: toISO(cs), classification: 'Complete Specification' };
  return { dof: '', classification: '' };
}

// Builds the Published patents list: every LR Sheet row with a Date of
// Publication that falls in the requested month/year. `abandonedRows` is the
// set of raw rows with a red Code cell (see abandonedPatents.js), used only
// to flag them — they stay in the list.
function buildPublishedPatents(dataRows, headers, includeDate, abandonedRows = new Set()) {
  const col = makeCol(headers);

  return dataRows
    .filter((row) => !isAbsent(col(row, 'Date of Publication')))
    .map((row) => {
      const pubDate = parseDate(col(row, 'Date of Publication'));
      return { row, pubDate };
    })
    .filter(({ pubDate }) => pubDate && includeDate(pubDate))
    .map(({ row, pubDate }) => {
      const { dof, classification } = filingInfo(
        col(row, 'date of filing (PS)'),
        col(row, 'Date of filing (CS)')
      );
      return {
        code: col(row, 'Code'),
        inventorName: col(row, 'Inventor Name'),
        mahe: classifyMahe(col(row, 'Code')),
        institutionCompany: cleanInstitution(col(row, 'INVENTOR Institution')),
        title: col(row, 'Title'),
        applicantName: col(row, 'Applicant Name'),
        applicationNumber: String(col(row, 'Application Number') || ''),
        dof,
        classification,
        dateOfPublication: toISO(pubDate),
        publicationNumber: col(row, 'Publication number'),
        form18Filed: isAbsent(col(row, 'Form-18/18A date of filing')) ? 'No' : 'Yes',
        isAbandoned: abandonedRows.has(row),
      };
    });
}

module.exports = { buildPublishedPatents };
