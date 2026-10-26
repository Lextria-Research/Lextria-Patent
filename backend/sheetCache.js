const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '10xTMqv42nKn9Ackusu6lfOJGifz4ClBRgVw3JCVQYZc';
const RANGE = 'DATA!A1:BN2336'; // full header + all data rows, columns A-BN
const CODE_COLUMN_RANGE = 'DATA!A1:A2336'; // same row span as RANGE, Code column only
const REFRESH_MS = (parseInt(process.env.SHEET_REFRESH_MINUTES, 10) || 5) * 60 * 1000;

let rows = null;
// Index-aligned with `rows` (index 0 is the header row, always false). true
// means that row's Code cell is manually filled red — the sheet's own
// convention for marking an application abandoned.
let abandonedFlags = [];
// Set when the last Code-column format fetch failed, so the Abandoned
// patents tab can warn instead of looking like a legitimately empty list.
let abandonedFlagsError = null;
let fetchedAt = null;
let lastError = null;
let inFlight = null;

// A cell counts as "filled red" if red clearly dominates — manual fills
// aren't always pure FFFF0000, so this tolerates close shades rather than
// requiring an exact match.
function isRedFill(color) {
  if (!color) return false;
  const r = color.red ?? 0;
  const g = color.green ?? 0;
  const b = color.blue ?? 0;
  return r > 0.8 && g < 0.25 && b < 0.25;
}

// Reads only the Code column's rendered background color. Kept separate
// from the values fetch (a different Sheets API method) and allowed to
// fail independently — losing formatting shouldn't take the whole sheet
// cache down, it just means abandoned rows stop being excluded.
async function fetchAbandonedFlags(sheets) {
  const result = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [CODE_COLUMN_RANGE],
    fields: 'sheets.data.rowData.values.effectiveFormat.backgroundColor',
  });
  const rowData = result.data.sheets?.[0]?.data?.[0]?.rowData || [];
  return rowData.map((r) => isRedFill(r.values?.[0]?.effectiveFormat?.backgroundColor));
}

// Built once and reused — re-authenticating with Google on every refresh
// was pure wasted latency, since the auth client already handles its own
// token refresh internally. Reset to null on failure so a bad first attempt
// (e.g. transient network issue) doesn't stay broken forever.
let sheetsClientPromise = null;

async function getSheetsClient() {
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const authOptions = {
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      };

      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        authOptions.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } else {
        authOptions.keyFile = path.join(__dirname, 'service-account-key.json');
      }

      const auth = new google.auth.GoogleAuth(authOptions);
      return google.sheets({ version: 'v4', auth });
    })().catch((err) => {
      sheetsClientPromise = null;
      throw err;
    });
  }
  return sheetsClientPromise;
}

// Re-reads the sheet and replaces the cache on success. On failure, keeps
// serving whatever was last fetched successfully instead of going empty.
async function refresh() {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const sheets = await getSheetsClient();

      // Fired together, not one after another — the values fetch and the
      // formatting fetch don't depend on each other. The formatting fetch's
      // own errors are caught right here, inside this combined promise, so
      // a formatting failure still can't fail the values fetch via
      // Promise.all — same independent-failure behavior as before, just
      // run concurrently instead of sequentially.
      const valuesPromise = sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
      });
      const flagsPromise = fetchAbandonedFlags(sheets)
        .then((flags) => ({ flags, error: null }))
        .catch((formatErr) => ({ flags: null, error: formatErr }));

      const [valuesResult, flagsResult] = await Promise.all([valuesPromise, flagsPromise]);

      rows = valuesResult.data.values || [];
      fetchedAt = new Date();
      lastError = null;

      if (flagsResult.error) {
        console.error('Code column format fetch failed, treating no rows as abandoned:', flagsResult.error.message);
        abandonedFlags = [];
        abandonedFlagsError = flagsResult.error.message;
      } else {
        abandonedFlags = flagsResult.flags;
        abandonedFlagsError = null;
      }
    } catch (err) {
      lastError = err;
      console.error('Sheet cache refresh failed, keeping last good data:', err.message);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

// Returns the cached rows, only waiting on a live fetch if the cache has
// never been populated (cold start racing an incoming request).
async function getRows() {
  if (rows === null) {
    await refresh();
    if (rows === null) {
      throw lastError || new Error('Sheet data not yet available');
    }
  }
  return rows;
}

function startAutoRefresh() {
  refresh(); // warm the cache immediately, without blocking server startup
  setInterval(refresh, REFRESH_MS);
}

function getStatus() {
  return {
    fetchedAt,
    lastError: lastError ? lastError.message : null,
    abandonedFlagsError,
    refreshIntervalMs: REFRESH_MS,
  };
}

// Index-aligned with getRows()'s array — abandonedFlags[i] tells you
// whether rows[i]'s Code cell is filled red.
function getAbandonedFlags() {
  return abandonedFlags;
}

module.exports = { getRows, refresh, startAutoRefresh, getStatus, getAbandonedFlags };
