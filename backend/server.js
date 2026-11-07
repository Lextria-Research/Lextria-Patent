require('dotenv').config();

// Every due date is calculated in local time, so "today" must be India's
// date, not the host's (UTC on most servers). Set TZ in the environment to override.
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const sheetCache = require('./sheetCache');
const { buildDues, makeCol, collectAssignees } = require('./dueBuilder');
const { toISO } = require('./dueLogic');
const { buildGrantedPatents } = require('./grantedPatents');
const { buildPublishedPatents } = require('./publishedPatents');
const { buildPatentFiled } = require('./patentFiled');
const { classifyMahe } = require('./patentClassification');
const { buildF9F18Check } = require('./f9f18Check');
const { buildAbandonedPatents, abandonedRowSet } = require('./abandonedPatents');
const { buildF1F26Delayed } = require('./f1f26Delayed');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

sheetCache.startAutoRefresh();

// Simple in-memory session store for the single demo admin login.
// No expiry, no persistence across restarts — good enough for a demo gate.
const validTokens = new Set();

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    validTokens.add(token);
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

app.use((req, res, next) => {
  if (req.path === '/api/login' || req.path === '/api/health' || req.path.startsWith('/api/webhooks/') || req.path.startsWith('/api/cliq-queue')) return next();
  const token = req.headers['x-auth-token'];
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

const CLIQ_QUEUE_FILE = path.join(__dirname, 'data', 'cliq_queue.json');

function getDefaultCliqQueue() {
  const now = new Date();
  const d3m = new Date();
  d3m.setMonth(d3m.getMonth() + 3);
  return [
    {
      id: 'cliq_pending_1',
      raw_message: 'Assign AR45 to Anusha - Title: Smart Automated Crop Harvesting System - Client: MAHE',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'PENDING_REVIEW',
      record: {
        project_code: 'AR45',
        title: 'Smart Automated Crop Harvesting System',
        assigned_to: 'Anusha',
        applicant_name: 'Manipal Academy of Higher Education (MAHE)',
        is_mahe: true,
        specification_type: 'PS',
        current_status: 'Idf sent, awaiting data',
        color_code_status: 'PURPLE',
        is_transferred_case: false,
        former_attorney_transfer: false,
        transfer_date: '',
        form_13_required: false,
        form_13_status: 'Not Applicable',
        form_13_deadline: '',
        form_26_deadline: '',
        ps_filing_date: '',
        cs_filing_date: '',
        client_commitment_date: '',
        status_notes: 'Pre-filing matter assigned via Zoho Cliq to Anusha. Form-13 is not required.',
        selectedTags: ['Cliq Assigned', 'MAHE']
      }
    },
    {
      id: 'cliq_pending_2',
      raw_message: 'Assign AR46 to Fiona - Transfer from former attorney, patent already filed (App No: 202341054321), FER Received on 15/09/2026. File Form 13 & Form 26.',
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'PENDING_REVIEW',
      record: {
        project_code: 'AR46',
        title: 'High-Efficiency Multi-Band Antenna for Satellite Communication',
        application_number: '202341054321',
        assigned_to: 'Fiona',
        applicant_name: 'Manipal Academy of Higher Education (MAHE)',
        is_mahe: true,
        specification_type: 'PS',
        current_status: 'FER Received',
        color_code_status: 'BLUE',
        is_transferred_case: true,
        former_attorney_transfer: true,
        transfer_date: now.toISOString().split('T')[0],
        form_13_required: true,
        form_13_status: 'Pending',
        form_13_deadline: d3m.toISOString().split('T')[0],
        form_26_deadline: d3m.toISOString().split('T')[0],
        ps_filing_date: '2023-09-15',
        cs_filing_date: '',
        client_commitment_date: '',
        status_notes: '⚡ FORMER ATTORNEY TRANSFER (TAKEOVER CASE): Form-13 (Address for Service) and Form-26 transfer POA required within 3 months.',
        selectedTags: ['Cliq Assigned', 'MAHE', 'Former Attorney Transfer', 'Form 13 Req']
      }
    }
  ];
}

function loadCliqQueue() {
  try {
    if (fs.existsSync(CLIQ_QUEUE_FILE)) {
      const raw = fs.readFileSync(CLIQ_QUEUE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading cliq_queue.json:', err);
  }
  const defaults = getDefaultCliqQueue();
  saveCliqQueue(defaults);
  return defaults;
}

function saveCliqQueue(queue) {
  try {
    const dir = path.dirname(CLIQ_QUEUE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CLIQ_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving cliq_queue.json:', err);
  }
}

// Inbound Zoho Cliq Assignment Channel Webhook
// Automatically triggered when an admin posts an assignment message in Zoho Cliq (e.g. #patent-assignments)
app.post('/api/webhooks/cliq-assignment', async (req, res) => {
  try {
    const rawPayload = req.body;
    let text = '';
    if (typeof rawPayload === 'string') {
      text = rawPayload;
    } else if (rawPayload && typeof rawPayload === 'object') {
      text = rawPayload.text || rawPayload.message || rawPayload.content || JSON.stringify(rawPayload);
    }

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'No message text provided in Cliq payload' });
    }

    // 1. Extract matter code (e.g. AR45, AR-50, etc.)
    let code = '';
    const codeMatch = text.match(/\b(AR\s*\d+|LR\s*\d+|[A-Z]{2,3}-\d+)\b/i);
    if (codeMatch) {
      code = codeMatch[1].replace(/\s+/g, '').toUpperCase();
    } else {
      code = `AR${Date.now().toString().slice(-3)}`;
    }

    // 2. Extract drafter (matched against registered drafters)
    const DRAFTERS = ['Abhishek', 'Amith', 'Anusha', 'Ayush', 'Fiona', 'Pranav Bhat', 'Pramith', 'Pratham', 'Thanush', 'Thilak'];
    let assignedDrafter = 'Anusha';
    for (const d of DRAFTERS) {
      if (new RegExp(`\\b${d}\\b`, 'i').test(text)) {
        assignedDrafter = d;
        break;
      }
    }

    // 3. Extract Title
    let title = `Patent Matter ${code}`;
    const titleRegex = /(?:title|invention|for\s+invention)\s*[:=-]\s*([^\n\r]+?)(?=(?:\s*[-|;,]\s*(?:client|applicant|drafter|assigned|type|delivery)\b)|$)/i;
    const titleMatch = text.match(titleRegex);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      const quoteMatch = text.match(/"([^"]+)"|'([^']+)'/);
      if (quoteMatch) title = quoteMatch[1] || quoteMatch[2];
    }
    title = title.replace(/\s*[-|;,]\s*(?:client|applicant|drafter|assigned|type|delivery)\s*:.*$/i, '').trim();
    title = title.replace(/^[“”"'\s]+|[“”"'\s]+$/g, '').trim();

    // 4. Extract Client
    let clientName = 'Manipal Academy of Higher Education (MAHE)';
    let isMahe = true;
    const clientMatch = text.match(/(?:client|applicant)\s*[:=-]\s*([^-\n]+)/i);
    if (clientMatch) {
      clientName = clientMatch[1].trim();
      isMahe = /manipal|mahe/i.test(clientName);
    } else if (!/\bMAHE\b|\bManipal\b/i.test(text)) {
      isMahe = false;
      clientName = 'External Client';
    }

    // 5. Specification Type
    const isCs = /\b(?:Complete Specification|CS)\b/i.test(text);
    const specType = isCs ? 'CS' : 'PS';

    // 6. Application Number & Key Dates Extraction
    let appNumber = '';
    const appExplicit = text.match(/(?:app(?:lication)?\s*(?:no\.?|number)?)\s*[:=-]?\s*([0-9]{10,14})/i);
    if (appExplicit) {
      appNumber = appExplicit[1].trim();
    } else {
      const appRaw = text.match(/\b(20[12]\d{9})\b/);
      if (appRaw) appNumber = appRaw[1];
    }

    let filingDate = '';
    const fileMatch = text.match(/(?:filed(?:\s*on)?|filing\s*date)\s*[:=-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    if (fileMatch) {
      const p = fileMatch[1].trim();
      const m = p.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      filingDate = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : p;
    }

    // 7. DETECT PROSECUTION STATUS ACROSS ALL STATUTORY PHASES
    const lower = text.toLowerCase();
    let currentStatus = 'Idf sent, awaiting data';
    let colorKey = 'PURPLE';
    let isPostFiling = false;

    if (lower.includes('form-30') || lower.includes('form 30') || lower.includes('hearing interest')) {
      currentStatus = 'Form-30 Hearing Interest Filed'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('ws filed') || lower.includes('written submissions filed')) {
      currentStatus = 'WS filed, waiting for Decision'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('ws sent for filing')) {
      currentStatus = 'WS sent for filing'; colorKey = 'YELLOW'; isPostFiling = true;
    } else if (lower.includes('hearing attended') || lower.includes('ws underdrafting') || lower.includes('ws under drafting')) {
      currentStatus = 'Hearing attended, WS underdrafting'; colorKey = 'YELLOW'; isPostFiling = true;
    } else if (lower.includes('hearing notice') || lower.includes('hearing scheduled') || (lower.includes('hearing') && lower.includes('notice'))) {
      currentStatus = 'Hearing notice received'; colorKey = 'BLUE'; isPostFiling = true;
    } else if (lower.includes('f4') || lower.includes('form 4') || lower.includes('extension of date of reply')) {
      currentStatus = 'Extension of date of reply filing under F4'; colorKey = 'ORANGE'; isPostFiling = true;
    } else if (lower.includes('form-3 filed') || lower.includes('form 3 filed')) {
      currentStatus = 'Form-3 filed'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('fer reply filed') || lower.includes('fer response filed')) {
      currentStatus = 'FER Reply filed, awaiting hearing'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('fer reply sent for filing')) {
      currentStatus = 'FER reply sent for filing'; colorKey = 'YELLOW'; isPostFiling = true;
    } else if (lower.includes('fer reply sent for confirmation')) {
      currentStatus = 'FER Reply sent for confirmation'; colorKey = 'ORANGE'; isPostFiling = true;
    } else if (lower.includes('fer reply under drafting') || lower.includes('drafting fer')) {
      currentStatus = 'FER reply under drafting'; colorKey = 'YELLOW'; isPostFiling = true;
    } else if (lower.includes('fer received') || lower.includes('fer notice') || lower.includes('first examination report') || /\bfer\b/.test(lower)) {
      currentStatus = 'FER Received'; colorKey = 'BLUE'; isPostFiling = true;
    } else if (lower.includes('patent granted') || /\bgranted\b/.test(lower)) {
      currentStatus = 'Patent Granted, awaiting instructions for renewal'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('f9 & f18 filed') || lower.includes('f9 and f18 filed')) {
      currentStatus = 'F9 & F18 filed'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('patent published') || /\bpublished\b/.test(lower)) {
      currentStatus = 'Patent Published'; colorKey = 'BLUE'; isPostFiling = true;
    } else if (lower.includes('cs filed') || lower.includes('complete spec filed')) {
      currentStatus = 'CS Filed'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('cs underdrafting') || lower.includes('drafting cs')) {
      currentStatus = 'CS underdrafting'; colorKey = 'YELLOW'; isPostFiling = false;
    } else if (lower.includes('ps filed') || lower.includes('provisional filed')) {
      currentStatus = 'PS Filed'; colorKey = 'GREEN'; isPostFiling = true;
    } else if (lower.includes('ps underdrafting') || lower.includes('drafting ps') || lower.includes('drafting')) {
      currentStatus = 'PS Underdrafting'; colorKey = 'YELLOW'; isPostFiling = false;
    } else if (lower.includes('ip shift') || lower.includes('abandoned')) {
      currentStatus = 'IP Shift'; colorKey = 'RED'; isPostFiling = false;
    }

    // 8. FORMER ATTORNEY TAKEOVER / TRANSFER DETECTION
    const transferKeywords = /(?:transfer(?:red)?|takeover|taken\s*over|former\s*attorney|previous\s*(?:attorney|agent|counsel|firm)|leaving\s*(?:their\s*)?(?:former|previous)|change\s*(?:of|in)\s*agent|address\s*for\s*service|form\s*13|form-13)/i;
    const isTransferredCase = transferKeywords.test(lower) || (isPostFiling && (appNumber || filingDate || transferKeywords.test(lower)));

    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    const addMonthsDate = (baseStr, months) => {
      const d = baseStr ? new Date(baseStr) : new Date();
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split('T')[0];
    };

    const transferDate = isTransferredCase ? todayIso : '';
    const form13Deadline = isTransferredCase ? addMonthsDate(todayIso, 3) : '';
    const form26TransferDeadline = isTransferredCase ? addMonthsDate(todayIso, 3) : '';

    let statusNotes = '';
    const selectedTags = ['Cliq Assigned', isMahe ? 'MAHE' : 'External Client'];

    if (isTransferredCase) {
      selectedTags.push('Former Attorney Transfer');
      selectedTags.push('Form 13 Req');
      statusNotes = `⚡ FORMER ATTORNEY TRANSFER (TAKEOVER CASE):
• Matter transferred from former attorney to Lextria Research on ${today.toLocaleDateString('en-IN')}.
• MANDATORY STATUTORY ACTIONS:
  1. Form-26 (Fresh Power of Attorney): File within 3 months of transfer (Due: ${form26TransferDeadline}) per Rule 135.
  2. Form-13 (Change in Address for Service): File under Section 57 / Rule 81 to update IPO registry to Lextria Research.
• Current Prosecution Status: ${currentStatus}.`;
    } else {
      statusNotes = `Pre-filing matter assigned via Zoho Cliq to ${assignedDrafter} on ${today.toLocaleDateString('en-IN')}.
Status: ${currentStatus}. Form-13 not required (Lextria will file directly at IPO).`;
    }

    const newRecord = {
      project_code: code,
      title: title,
      application_number: appNumber || '',
      assigned_to: assignedDrafter,
      applicant_name: clientName,
      is_mahe: isMahe,
      specification_type: specType,
      current_status: currentStatus,
      color_code_status: colorKey,
      is_transferred_case: isTransferredCase,
      former_attorney_transfer: isTransferredCase,
      transfer_date: transferDate,
      form_13_required: isTransferredCase,
      form_13_status: isTransferredCase ? 'Pending' : 'Not Applicable',
      form_13_deadline: form13Deadline,
      ps_filing_date: filingDate || '',
      post_dated_date: '',
      cs_filing_date: (specType === 'CS' && filingDate) ? filingDate : '',
      cs_deadline: '',
      form_1_deadline: '',
      form_26_deadline: isTransferredCase ? form26TransferDeadline : '',
      rfe_deadline: '',
      f1_status: isTransferredCase ? 'Check Former Attorney' : 'Pending Filing at IPO',
      f26_status: isTransferredCase ? 'Pending Transfer POA' : 'Pending Filing at IPO',
      status_notes: statusNotes,
      selectedTags: selectedTags,
      created_from: 'ZOHO_CLIQ',
      created_at: today.toISOString()
    };

    // Push to the Zoho Cliq review queue for Patent Admin to inspect & approve
    const queuedItem = {
      id: `cliq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      raw_message: text,
      created_at: today.toISOString(),
      status: 'PENDING_REVIEW',
      record: newRecord
    };

    const currentQueue = loadCliqQueue();
    currentQueue.unshift(queuedItem);
    saveCliqQueue(currentQueue);

    console.log(`[ZOHO CLIQ WEBHOOK] Queued assignment: ${code} assigned to ${assignedDrafter} [Status: ${currentStatus}, Transferred: ${isTransferredCase}]. Queue size: ${currentQueue.filter(q => q.status === 'PENDING_REVIEW').length}`);

    // Return rich Zoho Cliq interactive response card
    res.json({
      text: isTransferredCase
        ? `⚡ Former Attorney Transfer Patent **${code}** queued for Admin review & docketing at stage: **${currentStatus}**!\n📌 Form-13 (Address for Service) and Form-26 (Fresh POA) are flagged for filing within 3 months.`
        : `✅ Patent Matter **${code}** successfully queued for Admin review and assigned to **${assignedDrafter}** at stage: **${currentStatus}**!`,
      card: {
        title: `Patent Matter Queued: ${code} → ${assignedDrafter} [${currentStatus}]`,
        theme: 'modern-inline'
      },
      slides: [
        {
          type: 'table',
          title: 'Docket Information (Queued for Admin Review)',
          data: {
            headers: ['Attribute', 'Value'],
            rows: [
              ['Matter Code', code],
              ['Title of Invention', title],
              ['Assigned Drafter', assignedDrafter],
              ['Client / Applicant', clientName],
              ['Prosecution Stage', `${currentStatus} (${colorKey})`],
              ['Takeover / Transfer', isTransferredCase ? `YES (From Former Attorney on ${todayIso})` : 'NO (Pre-Filing New Matter)'],
              ['Form-13 (Address for Service)', isTransferredCase ? `MANDATORY under Sec 57/Rule 81 (Due: ${form13Deadline})` : 'Not Applicable (Pre-Filing)'],
              ['Form-26 (Power of Attorney)', isTransferredCase ? `MANDATORY under Rule 135 (Due: ${form26TransferDeadline})` : 'Due within 3m of eventual filing'],
              ['Application Number', appNumber || (isTransferredCase ? 'Pending Former Files' : 'Pending Filing at IPO')],
              ['Specification Type', specType === 'PS' ? 'Provisional Specification (PS)' : 'Complete Specification (CS)'],
            ]
          }
        }
      ],
      record: newRecord,
      queuedItem
    });
  } catch (err) {
    console.error('Error handling Cliq assignment webhook:', err);
    res.status(500).json({ error: 'Internal server error processing Cliq webhook', detail: err.message });
  }
});

// =========================================================================
// ZOHO CLIQ ASSIGNMENT QUEUE MANAGEMENT ENDPOINTS
// =========================================================================
app.get('/api/cliq-queue', (req, res) => {
  const queue = loadCliqQueue();
  const pending = queue.filter(q => q.status === 'PENDING_REVIEW');
  res.json({ success: true, queue, count: pending.length });
});

app.post('/api/cliq-queue/add', (req, res) => {
  const { item } = req.body || {};
  if (!item) return res.status(400).json({ error: 'No item provided' });
  const queue = loadCliqQueue();
  queue.unshift(item);
  saveCliqQueue(queue);
  res.json({ success: true, queue, count: queue.filter(q => q.status === 'PENDING_REVIEW').length });
});

app.post('/api/cliq-queue/:id/resolve', (req, res) => {
  const { id } = req.params;
  let queue = loadCliqQueue();
  queue = queue.map(q => q.id === id ? { ...q, status: 'RESOLVED', resolved_at: new Date().toISOString() } : q);
  saveCliqQueue(queue);
  res.json({ success: true, queue, count: queue.filter(q => q.status === 'PENDING_REVIEW').length });
});

app.delete('/api/cliq-queue/:id', (req, res) => {
  const { id } = req.params;
  let queue = loadCliqQueue();
  queue = queue.filter(q => q.id !== id);
  saveCliqQueue(queue);
  res.json({ success: true, queue, count: queue.filter(q => q.status === 'PENDING_REVIEW').length });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', sheetStatus: sheetCache.getStatus() });
});

// Force an immediate re-read of the sheet instead of waiting for the
// background refresh, without disturbing the cache if it fails.
app.post('/api/refresh', async (req, res) => {
  await sheetCache.refresh();
  const status = sheetCache.getStatus();
  if (status.lastError) {
    return res.status(502).json({
      error: 'Refresh failed, still serving previous data',
      detail: status.lastError,
      fetchedAt: status.fetchedAt,
    });
  }
  res.json({ ok: true, fetchedAt: status.fetchedAt });
});

app.get('/api/records', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    if (rows.length === 0) {
      return res.json({ records: [] });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const records = dataRows
  .filter((row) => row[0] !== undefined && String(row[0]).trim() !== '')
  .map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] !== undefined ? row[index] : '';
    });
    record.mahe = classifyMahe(record['Code']);
    return record;
  });

    res.json({ records, count: records.length });
  } catch (err) {
    console.error('Error fetching sheet data:', err.message);
    res.status(500).json({ error: 'Failed to fetch data from LR Sheet' });
  }
});

app.get('/api/records/:code', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const match = dataRows.find((row) => row[0] === req.params.code);

    if (!match) {
      return res.status(404).json({ error: `Record with code ${req.params.code} not found` });
    }

    const record = {};
    headers.forEach((header, index) => {
      record[header] = match[index] !== undefined ? match[index] : '';
    });

    res.json({ record });
  } catch (err) {
    console.error('Error fetching record:', err.message);
    res.status(500).json({ error: 'Failed to fetch record from LR Sheet' });
  }
});

app.get('/api/granted-patents', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    if (rows.length === 0) {
      return res.json({ patents: [], count: 0 });
    }
    const headers = rows[0];
    const dataRows = rows.slice(1).filter((row) => row[0] !== undefined && String(row[0]).trim() !== '');
    const patents = buildGrantedPatents(dataRows, headers, new Date())
      .sort((a, b) => (b.dateOfGrant || '').localeCompare(a.dateOfGrant || ''));
    res.json({ patents, count: patents.length });
  } catch (err) {
    console.error('Error building granted patents:', err.message);
    res.status(500).json({ error: 'Failed to fetch granted patents' });
  }
});

// Shared by /api/published-patents and /api/patent-filed: year=all ignores
// month too (true all-time total); month=all with a specific year covers
// every month in just that year.
function parseMonthYearFilter(req) {
  const yearParam = req.query.year;
  const monthParam = req.query.month;
  const allYears = yearParam === 'all';
  const allMonths = allYears || monthParam === 'all';

  const year = allYears ? null : parseInt(yearParam, 10);
  const month = allMonths ? null : parseInt(monthParam, 10);

  if (!allYears && !year) {
    return { error: 'Valid year (or "all") is required' };
  }
  if (!allMonths && (!month || month < 1 || month > 12)) {
    return { error: 'Valid month (1-12, or "all") is required' };
  }

  const includeDate = allYears
    ? () => true
    : allMonths
      ? (d) => d.getFullYear() === year
      : (d) => d.getMonth() + 1 === month && d.getFullYear() === year;

  return { allYears, allMonths, year, month, includeDate };
}

app.get('/api/published-patents', async (req, res) => {
  try {
    const filter = parseMonthYearFilter(req);
    if (filter.error) return res.status(400).json({ error: filter.error });
    const { allYears, allMonths, year, month, includeDate } = filter;

    const rows = await sheetCache.getRows();
    if (rows.length === 0) {
      return res.json({ month: allMonths ? 'all' : month, year: allYears ? 'all' : year, patents: [], count: 0 });
    }
    const headers = rows[0];
    const dataRows = rows.slice(1).filter((row) => row[0] !== undefined && String(row[0]).trim() !== '');

    const abandonedRows = abandonedRowSet(rows, sheetCache.getAbandonedFlags());
    const patents = buildPublishedPatents(dataRows, headers, includeDate, abandonedRows)
      .sort((a, b) => (a.dateOfPublication || '').localeCompare(b.dateOfPublication || ''));

    res.json({ month: allMonths ? 'all' : month, year: allYears ? 'all' : year, patents, count: patents.length });
  } catch (err) {
    console.error('Error building published patents:', err.message);
    res.status(500).json({ error: 'Failed to fetch published patents' });
  }
});

app.get('/api/patent-filed', async (req, res) => {
  try {
    const filter = parseMonthYearFilter(req);
    if (filter.error) return res.status(400).json({ error: filter.error });
    const { allYears, allMonths, year, month, includeDate } = filter;

    const rows = await sheetCache.getRows();
    if (rows.length === 0) {
      return res.json({ month: allMonths ? 'all' : month, year: allYears ? 'all' : year, patents: [], count: 0 });
    }
    const headers = rows[0];
    const dataRows = rows.slice(1).filter((row) => row[0] !== undefined && String(row[0]).trim() !== '');

    const abandonedRows = abandonedRowSet(rows, sheetCache.getAbandonedFlags());
    const patents = buildPatentFiled(dataRows, headers, includeDate, abandonedRows)
      .sort((a, b) => (a.dof || '').localeCompare(b.dof || ''));

    res.json({ month: allMonths ? 'all' : month, year: allYears ? 'all' : year, patents, count: patents.length });
  } catch (err) {
    console.error('Error building patent filed list:', err.message);
    res.status(500).json({ error: 'Failed to fetch patent filed list' });
  }
});

// Every application whose Code cell is filled red in the sheet. Unlike the
// other list tabs this reads the unfiltered rows — the red-cell flags are
// index-aligned with them. `flagsUnavailable` tells the UI the color read
// failed, so an empty list isn't mistaken for "nothing abandoned".
app.get('/api/abandoned-patents', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    const flagsUnavailable = Boolean(sheetCache.getStatus().abandonedFlagsError);
    if (rows.length === 0) {
      return res.json({ patents: [], count: 0, flagsUnavailable });
    }
    const headers = rows[0];
    const patents = buildAbandonedPatents(rows, headers, sheetCache.getAbandonedFlags())
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    res.json({ patents, count: patents.length, flagsUnavailable });
  } catch (err) {
    console.error('Error building abandoned patents:', err.message);
    res.status(500).json({ error: 'Failed to fetch abandoned patents' });
  }
});

app.get('/api/f9-f18-check', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    if (rows.length === 0) {
      return res.json({
        bothPending: [], f9PendingOnly: [], f18PendingOnly: [],
        duplicateApplicationNumbers: [], statusContradictions: [], unclear: [], blankCode: [],
      });
    }
    const headers = rows[0];
    const abandonedFlags = sheetCache.getAbandonedFlags();

    const report = buildF9F18Check(rows, headers, abandonedFlags, new Date());
    res.json(report);
  } catch (err) {
    console.error('Error building F9/F18 check:', err.message);
    res.status(500).json({ error: 'Failed to build F9/F18 check' });
  }
});

// Applications with Form 1 or Form 26 delayed or still pending, and whether
// postdating can fix them. Reads the unfiltered rows (the red-cell flags are
// index-aligned with them) and uses the same server "today" as /api/overdue.
// `flagsUnavailable` tells the UI the color read failed, so abandoned codes
// may be present.
app.get('/api/f1-f26-delayed', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    const flagsUnavailable = Boolean(sheetCache.getStatus().abandonedFlagsError);
    if (rows.length === 0) {
      return res.json({ patents: [], count: 0, flagsUnavailable });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patents = buildF1F26Delayed(rows, rows[0], sheetCache.getAbandonedFlags(), today);
    res.json({ patents, count: patents.length, flagsUnavailable });
  } catch (err) {
    console.error('Error building F1/F26 delayed list:', err.message);
    res.status(500).json({ error: 'Failed to build F1/F26 delayed list' });
  }
});

app.get('/api/dues', async (req, res) => {
  try {
    // month/year are each either a real number or the literal string 'all'.
    // 'all' for year ignores month too (true all-time, same as /api/overdue's
    // unbounded query) — there's no sensible "this month, every year" mode,
    // so the frontend forces month to 'all' as soon as year is.
    const yearAll = req.query.year === 'all';
    const monthAll = yearAll || req.query.month === 'all';
    const year = yearAll ? null : parseInt(req.query.year, 10);
    const month = monthAll ? null : parseInt(req.query.month, 10);

    if (!yearAll && (!year || Number.isNaN(year))) {
      return res.status(400).json({ error: "year must be a number or 'all'" });
    }
    if (!monthAll && (!month || month < 1 || month > 12)) {
      return res.status(400).json({ error: "month must be 1-12 or 'all'" });
    }

    const rows = await sheetCache.getRows();
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const col = makeCol(headers);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // The manual-entry lookup has to match however wide the due list itself
    // is scoped — a whole year or all-time can't be narrowed to one month.
    let savedResult;
    if (yearAll) {
      savedResult = await pool.query('SELECT * FROM due_entries');
    } else if (monthAll) {
      savedResult = await pool.query(
        'SELECT * FROM due_entries WHERE EXTRACT(YEAR FROM due_date) = $1',
        [year]
      );
    } else {
      savedResult = await pool.query(
        `SELECT * FROM due_entries
         WHERE EXTRACT(MONTH FROM due_date) = $1
           AND EXTRACT(YEAR FROM due_date) = $2`,
        [month, year]
      );
    }

    // Build a lookup map: "code|type|date" -> saved entry
    const savedMap = new Map();
    savedResult.rows.forEach((row) => {
      savedMap.set(`${row.code}|${row.type_of_due}|${row.due_date}`, row);
    });

    const getSaved = (code, type, date) => savedMap.get(`${code}|${type}|${date}`) || null;
    const assignees = collectAssignees(dataRows, col);
    const abandonedFlags = sheetCache.getAbandonedFlags();

    const includeDate = yearAll
      ? () => true
      : monthAll
        ? (d) => d.getFullYear() === year
        : (d) => d.getMonth() + 1 === month && d.getFullYear() === year;
    const { dues: allDues, dataIssues } = buildDues(dataRows, headers, { today, getSaved, includeDate, abandonedFlags });

    // Opt-in only: omitting the param (every caller but the Due dashboard
    // itself, e.g. Live Due Tracker) keeps today's behavior unchanged.
    const includeAbandoned = req.query.includeAbandoned !== 'false';
    const dues = includeAbandoned ? allDues : allDues.filter((d) => !d.isAbandoned);

    const summary = {
      total: dues.length,
      completed: dues.filter((d) => d.status === 'completed').length,
      pending: dues.filter((d) => d.status === 'pending').length,
      overdue: dues.filter((d) => d.status === 'overdue').length,
      dataIssues: dataIssues.length,
    };

    res.json({ month: monthAll ? 'all' : month, year: yearAll ? 'all' : year, summary, dues, dataIssues, assignees });
  } catch (err) {
    console.error('Error building dues:', err.message);
    res.status(500).json({ error: 'Failed to build due list' });
  }
});

// Every overdue due, across every month and year — same status rules as
// /api/dues (via buildDues), just not scoped to one month.
app.get('/api/overdue', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const col = makeCol(headers);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Overdue items can come from any past month, so the manual-entry
    // lookup can't be scoped to one month/year like /api/dues does.
    const savedResult = await pool.query('SELECT * FROM due_entries');
    const savedMap = new Map();
    savedResult.rows.forEach((row) => {
      savedMap.set(`${row.code}|${row.type_of_due}|${row.due_date}`, row);
    });
    const getSaved = (code, type, date) => savedMap.get(`${code}|${type}|${date}`) || null;
    const assignees = collectAssignees(dataRows, col);
    const abandonedFlags = sheetCache.getAbandonedFlags();

    const { dues } = buildDues(dataRows, headers, { today, getSaved, includeDate: () => true, abandonedFlags });

    // Opt-in only: omitting the param (every caller but the Overdue tab
    // itself, e.g. Live Due Tracker) keeps today's behavior unchanged.
    const includeAbandoned = req.query.includeAbandoned !== 'false';
    const overdue = dues
      .filter((d) => d.status === 'overdue')
      .filter((d) => includeAbandoned || !d.isAbandoned);

    const byType = {};
    ['PS-CS', 'FORM 1', 'FORM 26', 'FER', 'FORM 3', 'FORM 18', 'HEARING', 'WRITTEN SUBMISSION', 'RENEWAL']
      .forEach((t) => { byType[t] = 0; });
    overdue.forEach((d) => { byType[d.dueType] = (byType[d.dueType] || 0) + 1; });

    res.json({ total: overdue.length, byType, dues: overdue, assignees });
  } catch (err) {
    console.error('Error building overdue list:', err.message);
    res.status(500).json({ error: 'Failed to build overdue list' });
  }
});

// Dues with a deadline today or in the next 7 days that aren't completed —
// the Due dashboard's "Due soon" section. Not scoped to a month (the window
// can cross into the next one) and not filtered by anything the client picks.
// Same `today` and same status rules as /api/dues and /api/overdue (via
// buildDues), so anything already overdue is left to the Overdue tab. Also
// returns `today` so the client labels "Today" from the same clock.
const DUE_SOON_DAYS = 7;

app.get('/api/due-soon', async (req, res) => {
  try {
    const rows = await sheetCache.getRows();
    const headers = rows[0];
    const dataRows = rows.slice(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + DUE_SOON_DAYS);

    const savedResult = await pool.query(
      'SELECT * FROM due_entries WHERE due_date BETWEEN $1 AND $2',
      [toISO(today), toISO(windowEnd)]
    );
    const savedMap = new Map();
    savedResult.rows.forEach((row) => {
      savedMap.set(`${row.code}|${row.type_of_due}|${row.due_date}`, row);
    });
    const getSaved = (code, type, date) => savedMap.get(`${code}|${type}|${date}`) || null;
    const abandonedFlags = sheetCache.getAbandonedFlags();

    const includeDate = (d) => d >= today && d <= windowEnd;
    const { dues } = buildDues(dataRows, headers, { today, getSaved, includeDate, abandonedFlags });

    // Inside this window a due is either completed or pending (overdue needs
    // a deadline before today), so "not completed" is exactly "pending".
    const dueSoon = dues
      .filter((d) => d.status === 'pending')
      .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.code.localeCompare(b.code));

    res.json({ today: toISO(today), dues: dueSoon });
  } catch (err) {
    console.error('Error building due-soon list:', err.message);
    res.status(500).json({ error: 'Failed to build due-soon list' });
  }
});

// One due's extra LR fields for the due detail view
app.get('/api/due-detail', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code is required' });

  try {
    const rows = await sheetCache.getRows();
    const headers = rows[0] || [];
    const match = rows.slice(1).find((row) => row[0] === code);
    if (!match) return res.status(404).json({ error: `Code ${code} not found` });

    const col = (name) => {
      const idx = headers.indexOf(name);
      return idx === -1 ? '' : (match[idx] ?? '');
    };

    res.json({
      detail: {
        applicantName: col('Applicant Name'),
        inventorName: col('Inventor Name'),
        department: col('INVENTOR Institution'),
        inventorEmail: col('Inventor Email'),
        phoneNumber: String(col('Phone No.') || ''),
        postDateMonths: col('Remaining Post-Date Months'),
      },
    });
  } catch (err) {
    console.error('Error fetching due detail:', err.message);
    res.status(500).json({ error: 'Failed to fetch due detail' });
  }
});

// Get saved manual fields for one due occurrence
app.get('/api/due-entries', async (req, res) => {
  const { code, type, date } = req.query;

  if (!code || !type || !date) {
    return res.status(400).json({ error: 'code, type and date are required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM due_entries WHERE code = $1 AND type_of_due = $2 AND due_date = $3',
      [code, type, date]
    );
    res.json({ entry: result.rows[0] || null });
  } catch (err) {
    console.error('Error fetching due entry:', err.message);
    res.status(500).json({ error: 'Failed to fetch due entry' });
  }
});

// Save or update manual fields for one due occurrence
app.post('/api/due-entries', async (req, res) => {
  const {
    code, type_of_due, due_date,
    status, assigned_to, status_notes,
    suggested_action, issue, checklist_sent_date,
  } = req.body;

  if (!code || !type_of_due || !due_date) {
    return res.status(400).json({ error: 'code, type_of_due and due_date are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO due_entries
         (code, type_of_due, due_date, status, assigned_to,
          status_notes, suggested_action, issue, checklist_sent_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (code, type_of_due, due_date)
       DO UPDATE SET
         status = EXCLUDED.status,
         assigned_to = EXCLUDED.assigned_to,
         status_notes = EXCLUDED.status_notes,
         suggested_action = EXCLUDED.suggested_action,
         issue = EXCLUDED.issue,
         checklist_sent_date = EXCLUDED.checklist_sent_date,
         updated_at = NOW()
       RETURNING *`,
      [
        code, type_of_due, due_date,
        status || null, assigned_to || null, status_notes || null,
        suggested_action || null, issue || null, checklist_sent_date || null,
      ]
    );
    res.json({ entry: result.rows[0] });
  } catch (err) {
    console.error('Error saving due entry:', err.message);
    res.status(500).json({ error: 'Failed to save due entry' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});