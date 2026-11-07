// frontend/src/utils/cliqAssignmentParser.js
import { calculateAllStatutoryDeadlines, addMonths, toIsoDate } from './statutoryDeadlines.js';
import { STATUTORY_STATUSES, getStatusColor } from '../constants/patentStatuses.js';

export const REGISTERED_DRAFTERS = [
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

  // Natural date e.g. "20 Nov 2026" or "10 Dec 2026"
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Detects prosecution status across all 33 statutory statuses from Cliq message text
 * Categorizes whether the status implies the patent is already filed at IPO.
 * 
 * @param {string} text 
 * @returns {Object} { status, phase, colorKey, isPostFiling }
 */
export function detectProsecutionStatus(text) {
  if (!text) {
    return {
      status: 'Idf sent, awaiting data',
      phase: 'PHASE_1_PS',
      colorKey: 'PURPLE',
      isPostFiling: false
    };
  }
  const lower = text.toLowerCase();

  // 1. Hearing stage (Phase 5)
  if (lower.includes('form-30') || lower.includes('form 30') || lower.includes('hearing interest')) {
    return { status: 'Form-30 Hearing Interest Filed', phase: 'PHASE_5_HEARING', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('ws filed') || lower.includes('written submissions filed') || lower.includes('written submission filed')) {
    return { status: 'WS filed, waiting for Decision', phase: 'PHASE_5_HEARING', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('ws sent for filing') || lower.includes('written submissions sent')) {
    return { status: 'WS sent for filing', phase: 'PHASE_5_HEARING', colorKey: 'YELLOW', isPostFiling: true };
  }
  if (lower.includes('hearing attended') || lower.includes('ws underdrafting') || lower.includes('ws under drafting') || lower.includes('drafting ws')) {
    return { status: 'Hearing attended, WS underdrafting', phase: 'PHASE_5_HEARING', colorKey: 'YELLOW', isPostFiling: true };
  }
  if (lower.includes('hearing notice') || lower.includes('hearing scheduled') || lower.includes('controller hearing') || (lower.includes('hearing') && (lower.includes('notice') || lower.includes('received') || lower.includes('on')))) {
    return { status: 'Hearing notice received', phase: 'PHASE_5_HEARING', colorKey: 'BLUE', isPostFiling: true };
  }

  // 2. Office Actions / FER (Phase 4)
  if (lower.includes('f4') || lower.includes('form 4') || lower.includes('form-4') || lower.includes('extension of date of reply') || lower.includes('fer extension')) {
    return { status: 'Extension of date of reply filing under F4', phase: 'PHASE_4_FER', colorKey: 'ORANGE', isPostFiling: true };
  }
  if (lower.includes('form-3 filed') || lower.includes('form 3 filed') || lower.includes('section 8 filed')) {
    return { status: 'Form-3 filed', phase: 'PHASE_4_FER', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('fer reply filed') || lower.includes('fer response filed') || lower.includes('awaiting hearing')) {
    return { status: 'FER Reply filed, awaiting hearing', phase: 'PHASE_4_FER', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('fer reply sent for filing') || lower.includes('fer sent for filing')) {
    return { status: 'FER reply sent for filing', phase: 'PHASE_4_FER', colorKey: 'YELLOW', isPostFiling: true };
  }
  if (lower.includes('fer reply sent for confirmation') || lower.includes('fer reply sent to client')) {
    return { status: 'FER Reply sent for confirmation', phase: 'PHASE_4_FER', colorKey: 'ORANGE', isPostFiling: true };
  }
  if (lower.includes('fer reply under drafting') || lower.includes('drafting fer reply') || lower.includes('drafting fer response') || lower.includes('fer drafting')) {
    return { status: 'FER reply under drafting', phase: 'PHASE_4_FER', colorKey: 'YELLOW', isPostFiling: true };
  }
  if (lower.includes('fer received') || lower.includes('fer notice') || lower.includes('first examination report') || lower.includes('office action received') || /\bfer\b/.test(lower)) {
    return { status: 'FER Received', phase: 'PHASE_4_FER', colorKey: 'BLUE', isPostFiling: true };
  }

  // 3. Grant & Renewals (Phase 6)
  if (lower.includes('patent granted') || lower.includes('grant certificate') || lower.includes('grant issued') || /\bgranted\b/.test(lower)) {
    return { status: 'Patent Granted, awaiting instructions for renewal', phase: 'PHASE_6_GRANT_RENEWAL', colorKey: 'GREEN', isPostFiling: true };
  }
  const renewMatch = lower.match(/renew(?:ed)?\s+(?:for\s+)?(\d+)\s*years?/i);
  if (renewMatch) {
    const yr = renewMatch[1];
    return { status: `Patent Renewed for ${yr} years`, phase: 'PHASE_6_GRANT_RENEWAL', colorKey: 'GREEN', isPostFiling: true };
  }

  // 4. Appeals & Litigation (Phase 7)
  if (lower.includes('high court heard') || lower.includes('awaiting judgement')) {
    return { status: 'Appeal with high court heard, awaiting judgement', phase: 'PHASE_7_APPEAL', colorKey: 'BLUE', isPostFiling: true };
  }
  if (lower.includes('controller heard') || lower.includes('ws to be filed by deadline')) {
    return { status: 'Appeal with Controller heard, WS to be filed by deadline', phase: 'PHASE_7_APPEAL', colorKey: 'YELLOW', isPostFiling: true };
  }
  if (lower.includes('appeal with high court') || lower.includes('high court appeal filed')) {
    return { status: 'Appeal with high court filed waiting for date', phase: 'PHASE_7_APPEAL', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('appeal with controller') || lower.includes('controller appeal filed')) {
    return { status: 'Appeal with controller filed, waiting for hearing', phase: 'PHASE_7_APPEAL', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('refused') || lower.includes('refusal')) {
    if (lower.includes('high court')) {
      return { status: 'Patent Refused awaiting instructions for High court appeal', phase: 'PHASE_7_APPEAL', colorKey: 'ORANGE', isPostFiling: true };
    }
    return { status: 'Patent Refused awaiting instruction for appeal with controller', phase: 'PHASE_7_APPEAL', colorKey: 'ORANGE', isPostFiling: true };
  }

  // 5. Publication & Examination (Phase 3)
  if (lower.includes('f9 & f18 filed') || lower.includes('form 9 and form 18 filed') || lower.includes('f9 and f18 filed')) {
    return { status: 'F9 & F18 filed', phase: 'PHASE_3_PUB_EXAM', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('f9 filed') || lower.includes('form 9 filed')) {
    return { status: 'F9 filed, F18 not filed', phase: 'PHASE_3_PUB_EXAM', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('f18 filed') || lower.includes('form 18 filed') || lower.includes('rfe filed')) {
    return { status: 'F9 not filed, F18 filed', phase: 'PHASE_3_PUB_EXAM', colorKey: 'YELLOW', isPostFiling: true };
  }
  if (lower.includes('patent published') || lower.includes('published in journal') || lower.includes('published in gazette') || /\bpublished\b/.test(lower)) {
    return { status: 'Patent Published', phase: 'PHASE_3_PUB_EXAM', colorKey: 'BLUE', isPostFiling: true };
  }

  // 6. Complete Specification Filing & Drafting (Phase 2)
  if (lower.includes('cs filed') || lower.includes('complete specification filed') || lower.includes('complete spec filed')) {
    return { status: 'CS Filed', phase: 'PHASE_2_CS', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('ps-cs sent for filing')) {
    return { status: 'PS-CS Sent for filing', phase: 'PHASE_2_CS', colorKey: 'YELLOW', isPostFiling: false };
  }
  if (lower.includes('cs sent for filing')) {
    return { status: 'CS Sent for filing', phase: 'PHASE_2_CS', colorKey: 'YELLOW', isPostFiling: false };
  }
  if (lower.includes('cs draft sent') || (lower.includes('cs') && lower.includes('waiting confirmation'))) {
    return { status: 'CS Draft Sent, Waiting Confirmation', phase: 'PHASE_2_CS', colorKey: 'ORANGE', isPostFiling: false };
  }
  if (lower.includes('cs under review') || lower.includes('cs in review')) {
    return { status: 'CS under review', phase: 'PHASE_2_CS', colorKey: 'GREY', isPostFiling: false };
  }
  if (lower.includes('cs underdrafting') || lower.includes('cs under drafting') || lower.includes('drafting cs') || lower.includes('complete spec drafting')) {
    return { status: 'CS underdrafting', phase: 'PHASE_2_CS', colorKey: 'YELLOW', isPostFiling: false };
  }
  if (lower.includes('further checklist sent')) {
    return { status: 'Further checklist sent for CS', phase: 'PHASE_2_CS', colorKey: 'PURPLE', isPostFiling: false };
  }
  if (lower.includes('checklist sent for cs') || lower.includes('cs checklist')) {
    return { status: 'Checklist sent for CS, awaiting Data', phase: 'PHASE_2_CS', colorKey: 'PURPLE', isPostFiling: false };
  }

  // 7. Provisional Specification Filing & Drafting (Phase 1)
  if (lower.includes('ps postdated') || lower.includes('postdated') || lower.includes('post-dated') || lower.includes('section 17')) {
    return { status: 'PS Postdated', phase: 'PHASE_1_PS', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('ps filed') || lower.includes('provisional filed') || lower.includes('provisional specification filed')) {
    return { status: 'PS Filed', phase: 'PHASE_1_PS', colorKey: 'GREEN', isPostFiling: true };
  }
  if (lower.includes('ps sent for filing') || lower.includes('provisional sent for filing')) {
    return { status: 'PS Sent for filing', phase: 'PHASE_1_PS', colorKey: 'YELLOW', isPostFiling: false };
  }
  if (lower.includes('ps draft sent') || lower.includes('provisional draft sent')) {
    return { status: 'PS Draft Sent, waiting for confirmation', phase: 'PHASE_1_PS', colorKey: 'ORANGE', isPostFiling: false };
  }
  if (lower.includes('ps under review') || lower.includes('provisional under review')) {
    return { status: 'PS under review', phase: 'PHASE_1_PS', colorKey: 'GREY', isPostFiling: false };
  }
  if (lower.includes('ps underdrafting') || lower.includes('ps under drafting') || lower.includes('drafting ps') || lower.includes('drafting provisional') || lower.includes('under drafting') || lower.includes('underdrafting') || lower.includes('drafting')) {
    return { status: 'PS Underdrafting', phase: 'PHASE_1_PS', colorKey: 'YELLOW', isPostFiling: false };
  }
  if (lower.includes('due diligence report sent') || lower.includes('due diligence sent') || lower.includes('patentability report sent')) {
    return { status: 'Due diligence report sent', phase: 'PHASE_1_PS', colorKey: 'ORANGE', isPostFiling: false };
  }

  // 8. IP Shift / Abandoned (Phase 8)
  if (lower.includes('ip shift') || lower.includes('shift to') || lower.includes('abandoned') || lower.includes('abandon')) {
    return { status: 'IP Shift', phase: 'PHASE_8_IP_SHIFT', colorKey: 'RED', isPostFiling: false };
  }

  // Default pre-filing status
  return {
    status: 'Idf sent, awaiting data',
    phase: 'PHASE_1_PS',
    colorKey: 'PURPLE',
    isPostFiling: false
  };
}

/**
 * Checks if the assignment message represents a former attorney transfer / takeover
 * of an already-filed patent.
 * 
 * Criteria:
 * 1. Mentions former attorney / previous counsel / transfer / takeover, OR
 * 2. Has an official Indian patent application number or filing date, OR
 * 3. The detected status is a post-filing stage (e.g. FER, Hearing, Published, Filed).
 */
export function detectFormerAttorneyTransfer(text, detectedStatus, appNumber, filingDate) {
  if (!text) return { isTransferred: false, transferDate: '' };
  const lower = text.toLowerCase();

  const transferKeywords = /(?:transfer(?:red)?|takeover|taken\s*over|former\s*attorney|previous\s*(?:attorney|agent|counsel|firm|lawyer)|leaving\s*(?:their\s*)?(?:former|previous)|change\s*(?:of|in)\s*agent|address\s*for\s*service|form\s*13|form-13)/i;
  const hasTransferKeyword = transferKeywords.test(lower);
  const isPostFilingStage = Boolean(detectedStatus?.isPostFiling);
  const hasAppNo = Boolean(appNumber && appNumber.trim());
  const hasFilingDt = Boolean(filingDate && filingDate.trim());

  // If explicit transfer keywords are used, or an already-filed patent is being assigned
  const isTransferred = hasTransferKeyword || (isPostFilingStage && (hasTransferKeyword || hasAppNo || hasFilingDt || lower.includes('transfer')));

  // Extract explicit transfer date if given e.g. "Transferred on: 12/05/2026" or "Takeover date: 2026-05-12"
  let transferDate = '';
  const transferDateMatch = text.match(/(?:transfer(?:red)?(?:\s*on|\s*date)?|takeover(?:\s*date)?)\s*[:=-]?\s*([0-9a-zA-Z\s,/-]+?)(?=(?:\s*[-|;,]\s*[a-zA-Z]+:)|$)/i);
  if (transferDateMatch) {
    transferDate = parseDateString(transferDateMatch[1]);
  }
  if (!transferDate && isTransferred) {
    transferDate = toIsoDate(new Date());
  }

  return {
    isTransferred,
    transferDate,
    hasTransferKeyword,
    isPostFilingStage
  };
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
    let appNumber = '';
    let filingDate = '';
    let ferNoticeDate = '';
    let hearingDate = '';

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
    if (/code\s*:/i.test(text) || /drafter\s*:/i.test(text) || /title\s*:/i.test(text) || /app(?:lication)?\s*(?:no|number)?\s*:/i.test(text)) {
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

        const appMatch = line.match(/(?:app(?:lication)?\s*(?:no\.?|number)?)\s*[:=-]\s*([0-9a-zA-Z/-]+)/i);
        if (appMatch && !appNumber) {
          appNumber = appMatch[1].trim();
        }

        const filingMatch = line.match(/(?:filing\s*date|filed\s*on)\s*[:=-]\s*([0-9a-zA-Z\s,/-]+)/i);
        if (filingMatch && !filingDate) {
          filingDate = parseDateString(filingMatch[1]);
        }

        const ferMatch = line.match(/(?:fer\s*date|fer\s*issued|fer\s*notice)\s*[:=-]\s*([0-9a-zA-Z\s,/-]+)/i);
        if (ferMatch && !ferNoticeDate) {
          ferNoticeDate = parseDateString(ferMatch[1]);
        }

        const hearingMatch = line.match(/(?:hearing\s*date|hearing\s*scheduled)\s*[:=-]\s*([0-9a-zA-Z\s,/-]+)/i);
        if (hearingMatch && !hearingDate) {
          hearingDate = parseDateString(hearingMatch[1]);
        }
      }
    }

    // 3. Natural Sentence parsing (fallback / extraction)
    if (!code || !drafter || !title || !appNumber) {
      // Find code (AR followed by numbers, or LR, or alphanumeric code)
      const codeSearch = text.match(/\b(AR\s*\d+|LR\s*\d+|[A-Z]{2,3}-\d+)\b/i);
      if (codeSearch && !code) {
        code = codeSearch[1].replace(/\s+/g, '').toUpperCase();
      }

      // Find Application Number (e.g. 12-digit Indian patent number 202341012345 or App No: ...)
      if (!appNumber) {
        const appExplicit = text.match(/(?:app(?:lication)?\s*(?:no\.?|number)?)\s*[:=-]?\s*([0-9]{10,14})/i);
        if (appExplicit) {
          appNumber = appExplicit[1].trim();
        } else {
          // Look for standalone 12-digit Indian patent format (Year + 2 digits Office + 6 digits serial)
          const appRaw = text.match(/\b(20[12]\d{9})\b/);
          if (appRaw) {
            appNumber = appRaw[1];
          }
        }
      }

      // Find Filing Date
      if (!filingDate) {
        const fileMatch = text.match(/(?:filed(?:\s*on)?|filing\s*date)\s*[:=-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
        if (fileMatch) {
          filingDate = parseDateString(fileMatch[1]);
        }
      }

      // Find FER date
      if (!ferNoticeDate) {
        const ferMatch = text.match(/(?:fer(?:\s*notice|\s*received|\s*issued|\s*dated)?)\s*(?:on|dated)?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
        if (ferMatch) {
          ferNoticeDate = parseDateString(ferMatch[1]);
        }
      }

      // Find Hearing date
      if (!hearingDate) {
        const hearMatch = text.match(/(?:hearing(?:\s*(?:notice\s*)?received\s*(?:for|on)?|\s*on|\s*scheduled\s*for|\s*date)?)\s*[:=-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
        if (hearMatch) {
          hearingDate = parseDateString(hearMatch[1]);
        }
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
        const titleRegex = /(?:title|invention|for\s+invention)\s*[:=-]\s*([^\n\r]+?)(?=(?:\s*[-|;,]\s*(?:client|applicant|drafter|assigned|type|delivery|status|fer|hearing|app)\b)|$)/i;
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

    // Normalize basic fields
    const finalDrafter = matchDrafter(drafter || 'Anusha');
    const clientInfo = normalizeClient(clientRaw);
    let finalTitle = title ? title.trim() : `Patent Application ${code}`;
    finalTitle = finalTitle.replace(/\s*[-|;,]\s*(?:client|applicant|drafter|assigned|type|delivery|status|app|fer|hearing)\s*:.*$/i, '').trim();
    finalTitle = finalTitle.replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim();

    // 4. DETECT PROSECUTION STATUS ACROSS ALL 33 PHASES
    const detectedStatus = detectProsecutionStatus(text);

    // 5. DETECT FORMER ATTORNEY TAKEOVER / TRANSFER
    const transferAnalysis = detectFormerAttorneyTransfer(text, detectedStatus, appNumber, filingDate);
    const isTransferredCase = transferAnalysis.isTransferred;
    const transferDate = transferAnalysis.transferDate || (isTransferredCase ? toIsoDate(new Date()) : '');

    // 6. CALCULATE STATUTORY DEADLINES
    // If it's a transferred matter already filed at IPO, calculate Form 26 transfer deadline (3m from transfer)
    // and Form 13 deadline (3m from transfer).
    const nowIso = toIsoDate(new Date());
    const form26TransferDeadline = isTransferredCase && transferDate ? addMonths(transferDate, 3) : '';
    const form13Deadline = isTransferredCase && transferDate ? addMonths(transferDate, 3) : '';

    const statutoryParams = {
      project_code: code,
      title: finalTitle,
      specification_type: specType,
      ps_filing_date: filingDate || '',
      post_dated_date: '',
      cs_filing_date: (specType === 'CS' && filingDate) ? filingDate : '',
      client_commitment_date: commitmentDate || '',
      is_mahe: clientInfo.isMahe,
      is_transferred_case: isTransferredCase,
      transfer_date: transferDate,
    };
    const statutory = calculateAllStatutoryDeadlines(statutoryParams);

    // Format human-friendly transfer & statutory notes
    let statusNotes = '';
    const selectedTags = ['Cliq Assigned', clientInfo.isMahe ? 'MAHE' : 'External Client'];

    if (isTransferredCase) {
      selectedTags.push('Former Attorney Transfer');
      selectedTags.push('Form 13 Req');

      const transferDateDisplay = transferDate 
        ? new Date(transferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Immediate';
      const f26DeadlineDisplay = form26TransferDeadline
        ? new Date(form26TransferDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Within 3 Months';

      statusNotes = `⚡ FORMER ATTORNEY TRANSFER (TAKEOVER CASE):
• Transferred to Lextria Research on ${transferDateDisplay}.
• MANDATORY STATUTORY ACTIONS:
  1. Form-26 (Fresh Power of Attorney): File within 3 months of transfer (Statutory Deadline: ${f26DeadlineDisplay}) per Rule 135.
  2. Form-13 (Change in Address for Service): File under Section 57 / Rule 81 to record Lextria Research as official Agent for Service at IPO.
• Current Prosecution Status: ${detectedStatus.status} (Phase: ${detectedStatus.phase}).
• Assigned to ${finalDrafter} via Zoho Cliq.`;
    } else {
      statusNotes = `Pre-filing matter assigned via Zoho Cliq to ${finalDrafter} on ${new Date().toLocaleDateString('en-IN')}.
Status: ${detectedStatus.status}. Form-13 is NOT required (Lextria will file the initial application at IPO directly). Statutory deadlines activate upon filing.`;
    }

    const patentRecord = {
      project_code: code,
      title: finalTitle,
      application_number: appNumber || '',
      specification_type: specType,
      record_category: isTransferredCase ? 'TAKEOVER_FILING' : 'INTERNAL_FILING',
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

      // Prosecution Status assigned based on Cliq message!
      current_status: detectedStatus.status,
      color_code_status: detectedStatus.colorKey,
      phase: detectedStatus.phase,

      // Transfer & Former Attorney metadata
      is_transferred_case: isTransferredCase,
      former_attorney_transfer: isTransferredCase,
      transfer_date: transferDate,
      form_13_required: isTransferredCase,
      form_13_status: isTransferredCase ? 'Pending' : 'Not Applicable',
      form_13_deadline: form13Deadline,
      form_13_filing_date: '',

      // Filing Dates & Statutory Deadlines
      ps_filing_date: filingDate || '',
      post_dated_date: '',
      cs_filing_date: (specType === 'CS' && filingDate) ? filingDate : '',
      fer_notice_date: ferNoticeDate || '',
      hearing_date: hearingDate || '',
      client_commitment_date: commitmentDate || '',

      cs_deadline: statutory.cs_deadline || '',
      form_1_deadline: statutory.form_1_deadline || '',
      form_26_deadline: isTransferredCase ? form26TransferDeadline : (statutory.form_26_deadline || ''),
      rfe_deadline: statutory.rfe_deadline || '',
      fer_response_deadline: statutory.fer_response_deadline || '',

      f1_status: isTransferredCase ? 'Check Former Attorney' : 'Pending Filing at IPO',
      f26_status: isTransferredCase ? 'Pending Transfer POA' : 'Pending Filing at IPO',
      form_1_filing_date: '',
      form_26_filing_date: '',
      workdrive_folder_url: '',
      inventors_summary: '',
      abstract: '',
      claims: '',
      status_notes: statusNotes,
      selectedTags: selectedTags,
      created_at: new Date().toISOString(),
      created_from: 'ZOHO_CLIQ',
    };

    // Format Zoho Cliq Response Card payload
    const cliqResponse = {
      text: isTransferredCase
        ? `⚡ Former Attorney Transfer Patent **${code}** successfully created and assigned to **${finalDrafter}** at stage: **${detectedStatus.status}**!\n📌 Form-13 (Address for Service) and Form-26 (Fresh POA) are required within 3 months.`
        : `✅ Patent Matter **${code}** successfully created and assigned to **${finalDrafter}** at stage: **${detectedStatus.status}**!`,
      card: {
        title: `Patent Assignment: ${code} → ${finalDrafter} [${detectedStatus.status}]`,
        theme: isTransferredCase ? 'modern-inline' : 'modern-inline'
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
              ['Prosecution Stage', `${detectedStatus.status} (${detectedStatus.colorKey})`],
              ['Takeover / Transfer', isTransferredCase ? `YES (From Former Attorney on ${transferDate})` : 'NO (Pre-Filing New Matter)'],
              ['Form-13 (Address for Service)', isTransferredCase ? `MANDATORY under Sec 57/Rule 81 (Due: ${form13Deadline})` : 'Not Applicable (Pre-Filing)'],
              ['Form-26 (Power of Attorney)', isTransferredCase ? `MANDATORY under Rule 135 (Due: ${form26TransferDeadline})` : 'Due within 3m of eventual filing'],
              ['Application Number', appNumber || (isTransferredCase ? 'Pending Former Attorney Files' : 'Pending Filing at IPO')],
              ['Client Delivery Target', commitmentDate ? `${commitmentDate}` : 'To be set by drafter'],
            ]
          }
        }
      ]
    };

    return {
      success: true,
      record: patentRecord,
      summary: `Created ${code}: "${finalTitle}" assigned to ${finalDrafter} (${detectedStatus.status})`,
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
