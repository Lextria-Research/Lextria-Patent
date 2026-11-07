// frontend/src/utils/docxIdfParser.js
import JSZip from 'jszip';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?[6-9]\d{9}/;

/**
 * Normalizes country strings e.g. 'IN' -> 'India'
 */
function normalizeCountry(raw) {
  if (!raw) return 'India';
  const val = raw.trim().toUpperCase();
  if (val === 'IN' || val === 'INDIA') return 'India';
  if (val === 'US' || val === 'USA' || val === 'UNITED STATES') return 'United States';
  if (val === 'GB' || val === 'UK' || val === 'UNITED KINGDOM') return 'United Kingdom';
  if (val === 'SG' || val === 'SINGAPORE') return 'Singapore';
  if (val === 'AE' || val === 'UAE') return 'United Arab Emirates';
  if (val === 'DE' || val === 'GERMANY') return 'Germany';
  return raw.trim();
}

/**
 * Normalizes nationality strings e.g. 'IN' -> 'Indian'
 */
function normalizeNationality(raw) {
  if (!raw) return 'Indian';
  const val = raw.trim().toUpperCase();
  if (val === 'IN' || val === 'INDIAN' || val === 'INDIA') return 'Indian';
  if (val === 'US' || val === 'AMERICAN') return 'American';
  if (val === 'GB' || val === 'BRITISH') return 'British';
  return raw.trim();
}

/**
 * Normalizes gender strings e.g. 'M' -> 'Male'
 */
function normalizeGender(raw) {
  if (!raw) return 'Male';
  const val = raw.trim().toUpperCase();
  if (val === 'M' || val === 'MALE') return 'Male';
  if (val === 'F' || val === 'FEMALE') return 'Female';
  if (val === 'NA' || val === 'N/A') return '';
  return raw.trim();
}

/**
 * Clean and extract valid email
 */
function cleanEmail(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  // Strip concatenated docx label fragments if words ran together
  str = str.replace(/^(?:communication|email|contact|emailid|id)+/i, '');
  str = str.replace(/(?:ph|phone|contact|no|number|date).*$/i, '');
  const match = str.match(EMAIL_REGEX);
  return match ? match[0] : '';
}

/**
 * Clean and extract valid phone number
 */
function cleanPhone(raw) {
  if (!raw) return '';
  const match = String(raw).match(PHONE_REGEX);
  return match ? match[0].trim() : '';
}

/**
 * Clean text by stripping quotes, excessive whitespace
 */
function cleanText(text) {
  if (!text) return '';
  let str = String(text).trim();
  // Strip opening/closing quotes
  str = str.replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim();
  return str;
}

/**
 * Extract clean inner text from an XML element
 */
function getElementText(el) {
  if (!el) return '';
  return el.textContent || '';
}

/**
 * Parse an inventor IDF Word Document (.docx)
 * Compatible with both:
 * 1. IDF - Lextria Research.docx (General / External clients)
 * 2. IDF_ Lextria Research_MAHE.docx (MAHE clients)
 * 
 * @param {File|Blob|ArrayBuffer} fileInput - The .docx file from input or drag-and-drop
 * @returns {Promise<Object>} Extracted patent application data
 */
export async function parseIdfDocx(fileInput) {
  try {
    const zip = await JSZip.loadAsync(fileInput);
    const documentXmlFile = zip.file('word/document.xml');
    if (!documentXmlFile) {
      throw new Error('Invalid Word document: missing word/document.xml');
    }

    const xmlText = await documentXmlFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    // Extract all tables
    const tableNodes = Array.from(doc.getElementsByTagName('w:tbl'));

    // Matrix representation of all tables
    const tables = tableNodes.map((tableNode) => {
      const rowNodes = Array.from(tableNode.getElementsByTagName('w:tr'));
      return rowNodes.map((rowNode) => {
        const cellNodes = Array.from(rowNode.getElementsByTagName('w:tc'));
        return cellNodes.map((cell) => cleanText(getElementText(cell)));
      });
    });

    // 1. EXTRACT TITLE
    let title = '';
    let communicationEmail = '';
    let communicationPhone = '';
    let formFillDate = '';

    // Check Table 0 Row 2 first (Standard IDF title cell)
    if (tables.length > 0 && tables[0].length >= 3) {
      const possibleTitle = tables[0][2]?.[0] || '';
      if (possibleTitle && possibleTitle !== '“”' && possibleTitle !== '“ ”' && possibleTitle !== '""') {
        title = cleanText(possibleTitle);
      }
    }

    // Search across first 3 tables for contact email, phone, and date
    for (let t = 0; t < Math.min(3, tables.length); t++) {
      for (const row of tables[t]) {
        for (let c = 0; c < row.length; c++) {
          const cell = row[c] || '';

          // Check for email
          if (/email\s*id/i.test(cell)) {
            // Check current cell or subsequent cells for a real email address
            for (let nextC = c; nextC < row.length; nextC++) {
              const match = row[nextC].match(EMAIL_REGEX);
              if (match && !communicationEmail) {
                communicationEmail = match[0];
                break;
              }
            }
          }

          // Check for phone
          if (/(ph\.\s*no|phone\s*number|contact)/i.test(cell)) {
            for (let nextC = c; nextC < row.length; nextC++) {
              const match = row[nextC].match(PHONE_REGEX);
              if (match && !communicationPhone) {
                communicationPhone = match[0];
                break;
              }
            }
          }

          // Check for date of filling
          if (/date\s*of\s*filling/i.test(cell)) {
            for (let nextC = c; nextC < row.length; nextC++) {
              const dateMatch = row[nextC].match(/\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}/);
              if (dateMatch && !formFillDate) {
                formFillDate = dateMatch[0];
                break;
              }
            }
          }
        }
      }
    }

    // Also scan entire document XML for communication email or phone if still blank
    if (!communicationEmail) {
      const match = xmlText.match(EMAIL_REGEX);
      if (match && !match[0].includes('example.com') && !match[0].includes('schemas.openxmlformats')) {
        communicationEmail = cleanEmail(match[0]);
      }
    } else {
      communicationEmail = cleanEmail(communicationEmail);
    }

    if (communicationPhone) {
      communicationPhone = cleanPhone(communicationPhone);
    }

    // If title was not found in Table 0 Row 2, search through rows
    if (!title) {
      for (const table of tables) {
        for (let r = 0; r < table.length; r++) {
          const row = table[r];
          if (row.some(c => /tentative\s*title/i.test(c))) {
            if (r + 1 < table.length && table[r + 1]?.[0]) {
              const candidate = cleanText(table[r + 1][0]);
              if (candidate && candidate !== '“”' && candidate !== '“ ”' && candidate !== '""') {
                title = candidate;
                break;
              }
            }
          }
        }
        if (title) break;
      }
    }

    // 2. EXTRACT APPLICANT DETAILS (Table with "APPLICANT NAME")
    let applicantName = '';
    let applicantCountry = 'India';
    let applicantGender = '';
    let applicantNationality = 'Indian';
    let applicantAddress = '';
    let applicantsList = [];

    let applicantTableIdx = -1;
    for (let t = 0; t < tables.length; t++) {
      const headerRow = tables[t][0] || [];
      if (headerRow.some(c => /APPLICANT\s*NAME/i.test(c))) {
        applicantTableIdx = t;
        break;
      }
    }

    if (applicantTableIdx !== -1) {
      const appTable = tables[applicantTableIdx];
      const header = appTable[0] || [];
      const colName = header.findIndex(c => /APPLICANT\s*NAME/i.test(c));
      const colCountry = header.findIndex(c => /COUNTRY\s*OF\s*RESIDENCE/i.test(c));
      const colGender = header.findIndex(c => /GENDER/i.test(c));
      const colNat = header.findIndex(c => /NATIONALITY/i.test(c));
      const colAddr = header.findIndex(c => /ADDRESS\s*OF\s*THE\s*APPLICANT/i.test(c));

      // Process applicant rows
      for (let r = 1; r < appTable.length; r++) {
        const row = appTable[r];
        const rawName = colName !== -1 ? row[colName] : row[0];
        if (rawName && rawName.trim()) {
          const rawCountry = colCountry !== -1 ? row[colCountry] : '';
          const rawGen = colGender !== -1 ? row[colGender] : '';
          const rawNat = colNat !== -1 ? row[colNat] : '';
          const rawAddr = colAddr !== -1 ? row[colAddr] : '';

          const appObj = {
            id: `app_${r}_${Date.now()}`,
            name: rawName.trim(),
            country_of_residence: normalizeCountry(rawCountry),
            gender: normalizeGender(rawGen),
            nationality: normalizeNationality(rawNat),
            address: cleanText(rawAddr),
            email: communicationEmail,
            phone: communicationPhone,
            is_primary: r === 1,
            type: /manipal|mahe|university|institute/i.test(rawName) ? 'EDUCATIONAL' : 'OTHER',
          };
          applicantsList.push(appObj);

          if (r === 1) {
            applicantName = appObj.name;
            applicantCountry = appObj.country_of_residence;
            applicantGender = appObj.gender;
            applicantNationality = appObj.nationality;
            applicantAddress = appObj.address;
          }
        }
      }
    }

    // Determine MAHE status
    const isMahe = Boolean(
      /manipal\s*academy\s*of\s*higher\s*education|mahe/i.test(applicantName) ||
      /manipal/i.test(applicantAddress)
    );

    // Entity Category & Applicant Type determination
    let entityCategory = 'LARGE_ENTITY';
    let applicantType = 'OTHER';
    if (isMahe) {
      entityCategory = 'EDUCATIONAL_INSTITUTION';
      applicantType = 'EDUCATIONAL';
    } else if (/startup|dpiit/i.test(applicantName)) {
      entityCategory = 'STARTUP_DPIIT';
      applicantType = 'STARTUP';
    } else if (/msme|udyam|pvt\s*ltd|private\s*limited/i.test(applicantName)) {
      entityCategory = 'SMALL_ENTITY_UDYAM';
      applicantType = 'SMALL_ENTITY';
    }

    // 3. EXTRACT INVENTORS (Table with "INVENTOR NAME")
    let inventorTableIdx = -1;
    for (let t = 0; t < tables.length; t++) {
      const headerRow = tables[t][0] || [];
      if (headerRow.some(c => /INVENTOR\s*NAME/i.test(c))) {
        inventorTableIdx = t;
        break;
      }
    }

    const inventorsList = [];
    if (inventorTableIdx !== -1) {
      const invTable = tables[inventorTableIdx];
      const header = invTable[0] || [];
      const colName = header.findIndex(c => /INVENTOR\s*NAME/i.test(c));
      const colPhone = header.findIndex(c => /PHONE|CONTACT/i.test(c));
      const colCountry = header.findIndex(c => /COUNTRY\s*OF\s*RESIDENCE/i.test(c));
      const colGender = header.findIndex(c => /GENDER/i.test(c));
      const colNat = header.findIndex(c => /NATIONALITY/i.test(c));
      const colAddr = header.findIndex(c => /ADDRESS/i.test(c));

      for (let r = 1; r < invTable.length; r++) {
        const row = invTable[r];
        const rawName = colName !== -1 ? row[colName] : row[0];
        const rawAddr = colAddr !== -1 ? row[colAddr] : '';
        const rawPhone = colPhone !== -1 ? row[colPhone] : '';

        // Ignore placeholder / example rows
        if (!rawName || /^\(?example[:\s]/i.test(rawName) || /^\(?example[:\s]/i.test(rawAddr)) {
          continue;
        }

        const name = cleanText(rawName);
        if (!name) continue;

        let phone = colPhone !== -1 ? cleanText(row[colPhone]) : '';
        if (phone === '-' || !phone) {
          const phoneMatch = rawAddr.match(PHONE_REGEX);
          if (phoneMatch) phone = phoneMatch[0];
          else if (r === 1 && communicationPhone) phone = communicationPhone;
        }

        let email = '';
        const emailMatch = rawAddr.match(EMAIL_REGEX);
        if (emailMatch) {
          email = emailMatch[0];
        } else if (r === 1 && communicationEmail) {
          email = communicationEmail;
        }

        // Extract institution from address
        let institution = '';
        if (isMahe) {
          institution = 'Manipal Academy of Higher Education (MAHE)';
          if (/Manipal Institute of Technology|MIT/i.test(rawAddr)) institution = 'Manipal Institute of Technology (MIT)';
          else if (/Kasturba Medical College|KMC/i.test(rawAddr)) institution = 'Kasturba Medical College (KMC)';
          else if (/Manipal College of Pharmaceutical|MCOPS/i.test(rawAddr)) institution = 'Manipal College of Pharmaceutical Sciences (MCOPS)';
          else if (/Manipal College of Dental|MCODS/i.test(rawAddr)) institution = 'Manipal College of Dental Sciences (MCODS)';
        } else {
          const parts = rawAddr.split(/[,;\n]/).map(p => p.trim());
          if (parts.length > 2) {
            institution = parts[1] || parts[0];
          }
        }

        const invObj = {
          id: `inv_${r}_${Date.now()}`,
          name: name,
          phone: cleanPhone(phone) || '',
          email: cleanEmail(email) || '',
          country_of_residence: normalizeCountry(colCountry !== -1 ? row[colCountry] : 'India'),
          gender: normalizeGender(colGender !== -1 ? row[colGender] : 'Male'),
          nationality: normalizeNationality(colNat !== -1 ? row[colNat] : 'Indian'),
          address: cleanText(rawAddr),
          institution: institution,
        };

        inventorsList.push(invObj);
      }
    }

    // 4. EXTRACT SDG & TECHNICAL SUMMARY (Table 6, Table 7+)
    let sdgGoals = '';
    let isInterdisciplinary = '';
    let problemSolved = '';
    let objectives = '';
    let components = '';
    let technicalAdvancements = '';
    let advantages = '';
    let novelty = '';

    for (let t = 0; t < tables.length; t++) {
      const table = tables[t];
      for (const row of table) {
        const firstCell = row[0] || '';
        if (/Sustainable\s*Development\s*Goals/i.test(firstCell) && row[1]) {
          sdgGoals = cleanText(row[1]);
        }
        if (/inter-disciplinary/i.test(firstCell) && row[1]) {
          isInterdisciplinary = cleanText(row[1]);
        }
      }
    }

    // Check Section 2 answer tables
    if (tables.length > 7 && tables[7].length > 0 && tables[7][0][0]) {
      problemSolved = cleanText(tables[7][0][0]);
    }
    if (tables.length > 8 && tables[8].length > 0 && tables[8][0][0]) {
      objectives = cleanText(tables[8][0][0]);
    }
    if (tables.length > 9 && tables[9].length > 0 && tables[9][0][0]) {
      components = cleanText(tables[9][0][0]);
    }
    if (tables.length > 11 && tables[11].length > 0 && tables[11][0][0]) {
      technicalAdvancements = cleanText(tables[11][0][0]);
    }
    if (tables.length > 12 && tables[12].length > 0 && tables[12][0][0]) {
      advantages = cleanText(tables[12][0][0]);
    }
    if (tables.length > 14 && tables[14].length > 0 && tables[14][0][0]) {
      novelty = cleanText(tables[14][0][0]);
    }

    // Synthesize structured abstract
    const abstractSections = [];
    if (objectives) abstractSections.push(`OBJECTIVES:\n${objectives}`);
    if (problemSolved) abstractSections.push(`PROBLEM SOLVED:\n${problemSolved}`);
    if (components) abstractSections.push(`COMPONENTS & SYSTEM ARCHITECTURE:\n${components}`);
    if (technicalAdvancements) abstractSections.push(`TECHNICAL ADVANCEMENTS:\n${technicalAdvancements}`);
    if (advantages) abstractSections.push(`ADVANTAGES:\n${advantages}`);
    if (novelty) abstractSections.push(`NOVELTY & INVENTIVE STEP:\n${novelty}`);
    if (sdgGoals) abstractSections.push(`SUSTAINABLE DEVELOPMENT GOALS (SDG):\n${sdgGoals}`);
    if (isInterdisciplinary) abstractSections.push(`INTER-DISCIPLINARY RESEARCH: ${isInterdisciplinary}`);

    const structuredAbstract = abstractSections.join('\n\n');

    // Inventors summary string
    const inventorsSummary = inventorsList.map(i => i.name).join(', ');

    // Template detection: true if neither title nor any inventor has been filled
    const isTemplateOnly = !title && inventorsList.length === 0;

    return {
      success: true,
      isTemplateOnly,
      title: title || '',
      applicant_name: applicantName || (isMahe ? 'Manipal Academy of Higher Education (MAHE)' : ''),
      applicant_country: applicantCountry,
      applicant_gender: applicantGender,
      applicant_nationality: applicantNationality,
      applicant_address: applicantAddress,
      applicant_email: communicationEmail,
      applicant_phone: communicationPhone,
      is_mahe: isMahe,
      entity_category: entityCategory,
      applicant_type: applicantType,
      inventorsList: inventorsList,
      inventors_summary: inventorsSummary,
      applicantsList: applicantsList.length > 0 ? applicantsList : [
        {
          id: `app_1_${Date.now()}`,
          name: applicantName || 'Manipal Academy of Higher Education (MAHE)',
          country_of_residence: applicantCountry,
          gender: applicantGender,
          nationality: applicantNationality,
          address: applicantAddress,
          email: communicationEmail,
          phone: communicationPhone,
          is_primary: true,
          type: applicantType,
        }
      ],
      abstract: structuredAbstract,
      sdg_goals: sdgGoals,
      is_interdisciplinary: isInterdisciplinary,
      extracted_counts: {
        hasTitle: Boolean(title),
        inventorsCount: inventorsList.length,
        hasApplicant: Boolean(applicantName),
        hasContact: Boolean(communicationEmail || communicationPhone),
        hasAbstract: Boolean(structuredAbstract),
      }
    };
  } catch (err) {
    console.error('Error parsing IDF docx file:', err);
    return {
      success: false,
      error: err.message || 'Failed to extract data from Word document',
    };
  }
}
