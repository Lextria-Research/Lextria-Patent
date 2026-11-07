// frontend/src/utils/cliqAssignmentParser.js
import { calculateAllStatutoryDeadlines } from './statutoryDeadlines.js';

const REGISTERED_DRAFTERS = [
  'Abhishek',
  'Amith',
  'Anusha',
  'Ayush',
  'Fiona',
  'Pranav Bhat',
  'Pramith',
  'Pratham',
  'Thanush',
  'Thilak',
];

/**
 * Normalizes drafter name against registered team members
 */
export function matchDrafter(rawName) {
  if (!rawName) return 'Anusha';
  const clean = rawName.trim().toLowerCase();

  // Direct match
  const found = REGISTERED_DRAFTERS.find(d => d.toLowerCase() === clean);
  if (found) return found;

  // Substring match
  const partial = REGISTERED_DRAFTERS.find(d => clean.includes(d.toLowerCase()) || d.toLowerCase().includes(clean));
  if (partial) return partial;

  // Fallback to title-cased raw name
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

/**
 * Normalizes client name
 */
export function normalizeClient(rawClient) {
  if (!rawClient) return { name: 'Manipal Academy of Higher Education (MAHE)', isMahe: true, type: 'EDUCATIONAL', category: 'EDUCATIONAL_INSTITUTION' };
  const clean = rawClient.trim();
  if (/manipal|mahe/i.test(clean)) {
    return {
      name: 'Manipal Academy of Higher Education (MAHE)',
      isMahe: true,
      type: 'EDUCATIONAL',
      category: 'EDUCATIONAL_INSTITUTION'
    };
  }
  return {
    name: clean,
    isMahe: false,
    type: 'OTHER',
    category: 'LARGE_ENTITY'
  };
}

/**
 * Parse an ISO or natural date string into YYYY-MM-DD
 */
export function parseDateString(raw) {
  if (!raw) return '';
  const clean = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  // Natural date e.g. "20 Nov 2026"
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return '';
}

/**
 * Parse a Zoho Cliq Assignment Message
 * Supports natural chat, structured key-value, and slash command syntax
 * 
 * @param {string|Object} payload - Cliq message text or webhook JSON
 * @param {Array} existingRecords - List of existing records for conflict/sequence detection
 * @returns {Object} Parse result with normalized patent record and Cliq response card
 */
export function parseCliqAssignmentMessage(payload, existingRecords = []) {
  try {
    let text = '';
    if (typeof payload === 'string') {
      text = payload.trim();
    } else if (payload && typeof payload === 'object') {
      text = payload.text || payload.message || payload.content || '';
    }

    if (!text) {
      return { success: false, error: 'Empty message received from Zoho Cliq' };
    }

    let code = '';
    let drafter = '';
    let title = '';
    let clientRaw = '';
    let specType = 'PS';
    let commitmentDate = '';

    // 1. Slash command syntax: /assign AR45 Anusha "Title Here" MAHE [date]
    if (text.startsWith('/assign') || text.startsWith('/patent-assign')) {
      const parts = text.replace(/^\/(?:patent-)?assign\s*/i, '').trim();
      const quoteMatch = parts.match(/"([^"]+)"|'([^']+)'/);
      if (quoteMatch) {
        title = quoteMatch[1] || quoteMatch[2];
        const withoutTitle = parts.replace(quoteMatch[0], ' ');
        const tokens = withoutTitle.split(/\s+/).filter(Boolean);
        if (tokens.length > 0) code = tokens[0].toUpperCase();
        if (tokens.length > 1) drafter = tokens[1];
        if (tokens.length > 2) clientRaw = tokens.slice(2).join(' ');
      } else {
        const tokens = parts.split(/\s+/).filter(Boolean);
        if (tokens.length > 0) code = tokens[0].toUpperCase();
        if (tokens.length > 1) drafter = tokens[1];
        if (tokens.length > 2) title = tokens[2];
        if (tokens.length > 3) clientRaw = tokens.slice(3).join(' ');
      }
    }

    // 2. Structured Key-Value syntax (e.g. Code: AR45 \n Drafter: Fiona ...)
    if (/code\s*:/i.test(text) || /drafter\s*:/i.test(text) || /title\s*:/i.test(text)) {
      const lines = text.split(/[\r\n]+/);
      for (const line of lines) {
        const codeMatch = line.match(/(?:code|matter|project)\s*[:=-]\s*([a-zA-Z0-9_-]+)/i);
        if (codeMatch && !code) code = codeMatch[1].toUpperCase();

        const drafterMatch = line.match(/(?:drafter|assigned\s*to|assignee)\s*[:=-]\s*([a-zA-Z\s]+)/i);
        if (drafterMatch && !drafter) drafter = drafterMatch[1].trim();

        const titleMatch = line.match(/(?:title|invention)\s*[:=-]\s*(.+)/i);
        if (titleMatch && !title) title = titleMatch[1].trim();

        const clientMatch = line.match(/(?:client|applicant)\s*[:=-]\s*(.+)/i);
        if (clientMatch && !clientRaw) clientRaw = clientMatch[1].trim();

        const specMatch = line.match(/(?:type|specification)\s*[:=-]\s*([a-zA-Z_]+)/i);
        if (specMatch) {
          const val = specMatch[1].toUpperCase();
          if (val === 'CS' || val === 'COMPLETE') specType = 'CS';
          else specType = 'PS';
        }

        const dateMatch = line.match(/(?:delivery|commitment|due)\s*[:=-]\s*([0-9a-zA-Z\s,/-]+)/i);
        if (dateMatch && !commitmentDate) {
          commitmentDate = parseDateString(dateMatch[1]);
        }
      }
    }

    // 3. Natural Sentence syntax:
    // e.g. "Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE"
    // or "Please assign AR46 to Pramith for MAHE: Smart Drone"
    if (!code || !drafter || !title) {
      // Find code (AR followed by numbers, or alphanumeric code)
      const codeSearch = text.match(/\b(AR\s*\d+|LR\s*\d+|[A-Z]{2,3}-\d+)\b/i);
      if (codeSearch && !code) {
        code = codeSearch[1].replace(/\s+/g, '').toUpperCase();
      }

      // Find drafter
      if (!drafter) {
        for (const regDrafter of REGISTERED_DRAFTERS) {
          const regex = new RegExp(`\\b(?:to\\s+)?${regDrafter}\\b`, 'i');
          if (regex.test(text)) {
            drafter = regDrafter;
            break;
          }
        }
      }

      // Find Title: look for "Title: ...", "Invention: ...", or text following dash/hyphen
      if (!title) {
        const titleRegex = /(?:title|invention|for\s+invention)\s*[:=-]\s*([^\n\r]+?)(?=(?:\s*[-|;,]\s*(?:client|applicant|drafter|assigned|type|delivery)\b)|$)/i;
        const titleMatch = text.match(titleRegex);
        if (titleMatch) {
          title = titleMatch[1].trim();
        } else {
          // Check quotes
          const quoteMatch = text.match(/"([^"]+)"|'([^']+)'/);
          if (quoteMatch) {
            title = quoteMatch[1] || quoteMatch[2];
          }
        }
      }

      // Find Client
      if (!clientRaw) {
        const clientRegex = /(?:client|applicant)\s*[:=-]\s*([^-\n]+)/i;
        const clientMatch = text.match(clientRegex);
        if (clientMatch) {
          clientRaw = clientMatch[1].trim();
        } else if (/\bMAHE\b|\bManipal\b/i.test(text)) {
          clientRaw = 'Manipal Academy of Higher Education (MAHE)';
        }
      }

      // Check specification type
      if (/\b(?:Complete Specification|CS)\b/i.test(text)) {
        specType = 'CS';
      }
    }

    // Default Code if missing: generate next AR code
    if (!code) {
      let maxNum = 0;
      existingRecords.forEach(r => {
        const m = String(r.project_code || '').match(/^AR(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      code = `AR${String(maxNum + 1).padStart(2, '0')}`;
    }

    // Normalize values
    const finalDrafter = matchDrafter(drafter || 'Anusha');
    const clientInfo = normalizeClient(clientRaw);
    let finalTitle = title ? title.trim() : `Patent Application ${code}`;
    finalTitle = finalTitle.replace(/\s*[-|;,]\s*(?:client|applicant|drafter|assigned|type|delivery)\s*:.*$/i, '').trim();
    finalTitle = finalTitle.replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim();

    // IMPORTANT: When a matter is newly assigned in Cliq, it has NOT been filed at IPO yet!
    // ps_filing_date and cs_filing_date are empty.
    // Statutory deadlines (Sec 9 CS Due, Sec 7 Form 1 Due, Rule 135 Form 26 Due) start only from actual IPO filing date.
    const formValues = {
      project_code: code,
      title: finalTitle,
      specification_type: specType,
      ps_filing_date: '', // Not filed yet! Pre-filing assignment.
      post_dated_date: '',
      cs_filing_date: '',
      client_commitment_date: commitmentDate || '',
      is_mahe: clientInfo.isMahe,
    };
    const statutory = calculateAllStatutoryDeadlines(formValues);

    const patentRecord = {
      project_code: code,
      title: finalTitle,
      application_number: '',
      specification_type: specType,
      record_category: 'INTERNAL_FILING',
      classification: code.startsWith('AR') ? 'AR' : 'GENERAL',
      applicant_name: clientInfo.name,
      applicant_type: clientInfo.type,
      entity_category: clientInfo.category,
      applicant_country: 'India',
      applicant_gender: '',
      applicant_nationality: 'Indian',
      applicant_address: clientInfo.isMahe ? 'Madhav Nagar, Manipal, Karnataka 576104' : '',
      applicant_email: '',
      applicant_phone: '',
      is_mahe: clientInfo.isMahe,
      assigned_to: finalDrafter,
      current_status: 'Idf sent, awaiting data',
      color_code_status: 'PURPLE',
      ps_filing_date: '',
      post_dated_date: '',
      cs_filing_date: '',
      client_commitment_date: commitmentDate || '',
      cs_deadline: '',
      form_1_deadline: '',
      form_26_deadline: '',
      rfe_deadline: '',
      f1_status: 'Pending Filing at IPO',
      f26_status: 'Pending Filing at IPO',
      form_1_filing_date: '',
      form_26_filing_date: '',
      workdrive_folder_url: '',
      inventors_summary: '',
      abstract: '',
      claims: '',
      status_notes: `Assigned via Zoho Cliq to ${finalDrafter} on ${new Date().toLocaleDateString('en-IN')}. Awaiting IDF data from inventor.`,
      selectedTags: ['Cliq Assigned', clientInfo.isMahe ? 'MAHE' : 'External Client'],
      created_at: new Date().toISOString(),
      created_from: 'ZOHO_CLIQ',
    };

    // Format Zoho Cliq Response Card payload
    const cliqResponse = {
      text: `✅ Patent Matter **${code}** successfully created and assigned to **${finalDrafter}**!`,
      card: {
        title: `Patent Assignment: ${code} → ${finalDrafter}`,
        theme: 'modern-inline'
      },
      slides: [
        {
          type: 'table',
          title: 'Matter Docket Information',
          data: {
            headers: ['Attribute', 'Details'],
            rows: [
              ['Matter Code', code],
              ['Title of Invention', finalTitle],
              ['Assigned Drafter', finalDrafter],
              ['Client / Applicant', clientInfo.name],
              ['Specification Type', specType === 'PS' ? 'Provisional Specification (PS)' : 'Complete Specification (CS)'],
              ['Filing Status', 'Pre-Filing (Not filed at IPO yet)'],
              ['Initial Docket Status', 'Idf sent, awaiting data (Purple)'],
              ['Client Delivery Target', commitmentDate ? `${commitmentDate}` : 'To be set by drafter'],
              ['Statutory Deadlines', 'Calculated automatically upon filing at IPO (e.g. 12m for CS under Sec 9)']
            ]
          }
        }
      ]
    };

    return {
      success: true,
      record: patentRecord,
      summary: `Created ${code}: "${finalTitle}" assigned to ${finalDrafter} (${clientInfo.name})`,
      cliqResponse
    };
  } catch (err) {
    console.error('Error parsing Cliq assignment message:', err);
    return {
      success: false,
      error: err.message || 'Failed to parse Zoho Cliq assignment message'
    };
  }
}
