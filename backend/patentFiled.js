const { isAbsent, parseDate, toISO } = require('./dueLogic');
const { makeCol } = require('./dueBuilder');
const { classifyMahe, cleanInstitution } = require('./patentClassification');

// Unlike Published patents' D.O.F./Classification (which favors the PS
// date to record the historical filing path), this tab reflects the
// current filing stage: once a CS exists, that supersedes PS entirely.
//
// One classification per patent, from which of the two dates exist (blank,
// "NA", "Not filed" and other non-dates count as no date):
//   PS only  -> Provisional Specification, D.O.F. = PS date
//   CS only  -> Complete Specification (a direct CS), D.O.F. = CS date
//   both     -> PS-CS, D.O.F. = CS date
// D.O.F. is a single date, so a PS-CS patent is listed once, in its CS
// month, and never again in its PS month.
function filingInfo(psRaw, csRaw) {
  const cs = parseDate(csRaw);
  const ps = parseDate(psRaw);
  if (cs && ps) return { dofDate: cs, classification: 'PS-CS' };
  if (cs) return { dofDate: cs, classification: 'Complete Specification' };
  if (ps) return { dofDate: ps, classification: 'Provisional Specification' };
  return null;
}

// Builds the Patent filed list: every LR Sheet row with a PS or CS filing
// date whose D.O.F. (see filingInfo) falls in the requested month/year.
// `abandonedRows` is the set of raw rows with a red Code cell (see
// abandonedPatents.js), used only to flag them — they stay in the list.
function buildPatentFiled(dataRows, headers, includeDate, abandonedRows = new Set()) {
  const col = makeCol(headers);

  return dataRows
    .map((row) => {
      const filing = filingInfo(col(row, 'date of filing (PS)'), col(row, 'Date of filing (CS)'));
      return { row, filing };
    })
    .filter(({ filing }) => filing && includeDate(filing.dofDate))
    .map(({ row, filing }) => {
      const pubDate = parseDate(col(row, 'Date of Publication'));
      return {
        code: col(row, 'Code'),
        inventorName: col(row, 'Inventor Name'),
        mahe: classifyMahe(col(row, 'Code')),
        institutionCompany: cleanInstitution(col(row, 'INVENTOR Institution')),
        title: col(row, 'Title'),
        applicantName: col(row, 'Applicant Name'),
        applicationNumber: String(col(row, 'Application Number') || ''),
        dof: toISO(filing.dofDate),
        classification: filing.classification,
        publicationStatus: pubDate ? 'Published' : 'Not published',
        dateOfPublication: pubDate ? toISO(pubDate) : '',
        isAbandoned: abandonedRows.has(row),
      };
    });
}

module.exports = { buildPatentFiled };
