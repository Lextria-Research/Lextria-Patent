require('dotenv').config();

// Every due date is calculated in local time, so "today" must be India's
// date, not the host's (UTC on most servers). Set TZ in the environment to override.
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

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
  if (req.path === '/api/login' || req.path === '/api/health') return next();
  const token = req.headers['x-auth-token'];
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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