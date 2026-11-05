// frontend/src/lib/ecosystemSync.js
// Lextria Ecosystem Interlinking: Patent Dashboard <-> Central Core & Finance
import { coreDb, financeDb } from './supabase.js';
import DEFAULT_CLIENTS from '../data/clients.json';

export const MAHE_CLIENT_ID = 'c0736c22-db5e-4bd1-b7f5-5facc08d865e';
export const INDEP_CLIENT_ID = '213f9e73-6f5e-4cef-8dec-23ba9c834e3b';
export const AAI_CLIENT_ID = 'd224d523-bc5c-4e06-a6ae-c5b9973bfdbe';

export const VALID_ENTITY_CATEGORIES = [
  'EDUCATIONAL_INSTITUTION',
  'STARTUP_DPIIT',
  'SMALL_ENTITY_UDYAM',
  'INDIVIDUAL',
  'LARGE_ENTITY',
];

/**
 * Normalizes entity categories to comply with database check constraint:
 * CHECK (entity_category IN ('EDUCATIONAL_INSTITUTION', 'STARTUP_DPIIT', 'SMALL_ENTITY_UDYAM', 'INDIVIDUAL', 'LARGE_ENTITY'))
 */
export function normalizeEntityCategory(cat, isMahe = false) {
  if (isMahe) return 'EDUCATIONAL_INSTITUTION';
  if (!cat) return 'LARGE_ENTITY';
  const c = String(cat).trim().toUpperCase();
  if (VALID_ENTITY_CATEGORIES.includes(c)) return c;
  if (c.includes('EDUCAT') || c.includes('UNIV') || c.includes('COLLEGE')) return 'EDUCATIONAL_INSTITUTION';
  if (c.includes('STARTUP')) return 'STARTUP_DPIIT';
  if (c.includes('SMALL') || c.includes('MSME') || c.includes('UDYAM')) return 'SMALL_ENTITY_UDYAM';
  if (c.includes('INDIV') || c.includes('NATURAL') || c.includes('PERSON')) return 'INDIVIDUAL';
  return 'LARGE_ENTITY';
}

function normalizeString(str = '') {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(private|pvt|limited|ltd|inc|technologies|technology|corp|corporation|solutions|institute|college|university)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches an applicant name or project code against an array of client objects.
 */
export function findClientInList(applicantName = '', projectCode = '', clients = []) {
  if (!Array.isArray(clients) || clients.length === 0) return null;

  const appClean = normalizeString(applicantName);
  const rawApp = String(applicantName || '').trim().toLowerCase();
  const rawCode = String(projectCode || '').trim().toUpperCase();

  // 1. Exact match by client_name
  const exactName = clients.find(
    (c) => c.client_name && c.client_name.trim().toLowerCase() === rawApp
  );
  if (exactName) return exactName;

  // 2. Project code prefix match (e.g. "RMTPL", "RT01" -> match client_code "RMTPL" or "RT")
  if (rawCode) {
    const codeMatch = clients.find((c) => {
      const cc = String(c.client_code || '').trim().toUpperCase();
      if (!cc) return false;
      return rawCode.startsWith(cc) || cc.startsWith(rawCode.replace(/\d+$/, ''));
    });
    if (codeMatch) return codeMatch;
  }

  // 3. Normalized token / substring overlap
  if (appClean.length >= 3) {
    for (const c of clients) {
      const cClean = normalizeString(c.client_name);
      if (!cClean || cClean.length < 3) continue;
      if (appClean.includes(cClean) || cClean.includes(appClean)) {
        return c;
      }
    }
  }

  return null;
}

/**
 * Resolves appropriate client ID from applicant name, MAHE flag, project code, and client list.
 */
export function resolveClientId(applicantName = '', isMahe = false, clientList = null, projectCode = '') {
  const rawApp = (applicantName || '').trim().toLowerCase();

  // 1. Explicit or detected MAHE
  if (isMahe || rawApp.includes('manipal') || rawApp.includes('mahe')) {
    return MAHE_CLIENT_ID;
  }

  // 2. Check provided clientList, cached clients from localStorage, or DEFAULT_CLIENTS
  let pool = Array.isArray(clientList) && clientList.length > 0 ? clientList : null;
  if (!pool) {
    try {
      const cached = localStorage.getItem('patent_cached_clients');
      if (cached) pool = JSON.parse(cached);
    } catch {}
  }
  if (!pool || !pool.length) {
    pool = DEFAULT_CLIENTS;
  }

  const matched = findClientInList(applicantName, projectCode, pool);
  if (matched && matched.id) {
    return matched.id;
  }

  // 3. Fallback checks for Astraea / Independent
  const upper = (applicantName || '').toUpperCase();
  if (upper.includes('AAIS') || upper.includes('ASTRAEA')) return AAI_CLIENT_ID;
  if (upper.includes('INDEPENDENT')) return INDEP_CLIENT_ID;

  return INDEP_CLIENT_ID;
}

/**
 * Asynchronously resolves client ID with direct database query fallback if not found in memory.
 */
export async function resolveClientIdAsync(applicantName = '', isMahe = false, projectCode = '', clientList = null) {
  const syncId = resolveClientId(applicantName, isMahe, clientList, projectCode);
  if (syncId !== INDEP_CLIENT_ID) {
    return syncId;
  }

  // Try querying core.clients directly
  const rawApp = (applicantName || '').trim();
  if (rawApp && !isMahe && !rawApp.toLowerCase().includes('independent')) {
    try {
      const searchWord = rawApp.split(/[\s,]+/)[0];
      if (searchWord && searchWord.length >= 3) {
        const { data: dbClients } = await coreDb
          .from('clients')
          .select('id, client_name, client_code')
          .ilike('client_name', `%${searchWord}%`)
          .limit(10);

        if (Array.isArray(dbClients) && dbClients.length > 0) {
          const matched = findClientInList(applicantName, projectCode, dbClients);
          if (matched?.id) return matched.id;
          return dbClients[0].id;
        }
      }
    } catch (e) {
      console.warn('resolveClientIdAsync DB lookup error:', e);
    }
  }

  return syncId;
}

/**
 * Ensures a patent project code exists in core.project_codes and returns its UUID.
 * Automatically synchronizes status and client_id across apps.
 */
export async function ensurePatentProjectCode(record, clientList = null) {
  if (!record || !record.project_code) return null;
  const code = record.project_code.trim();

  try {
    const resolvedClientId =
      record.client_id ||
      (await resolveClientIdAsync(record.applicant_name, record.is_mahe, code, clientList));

    const expectedStatus = record.is_abandoned ? 'ABANDONED' : 'ACTIVE';

    // 1. Check if already exists in core.project_codes
    const { data: existing } = await coreDb
      .from('project_codes')
      .select('id, client_id, status, title')
      .eq('code', code)
      .maybeSingle();

    if (existing && existing.id) {
      const updates = {};
      if (existing.status !== expectedStatus) {
        updates.status = expectedStatus;
      }
      if (record.title && (!existing.title || existing.title === code)) {
        updates.title = record.title;
      }
      if (resolvedClientId && existing.client_id !== resolvedClientId) {
        updates.client_id = resolvedClientId;
      }

      if (Object.keys(updates).length > 0) {
        await coreDb
          .from('project_codes')
          .update(updates)
          .eq('id', existing.id);
      }
      return existing.id;
    }

    // 2. Create in core.project_codes
    const { data: created, error } = await coreDb
      .from('project_codes')
      .insert({
        code: code,
        department: 'IP_PATENT',
        client_id: resolvedClientId,
        title: record.title || `Patent Application ${code}`,
        status: expectedStatus,
        owning_app: 'IP_LEDGER',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('EcosystemSync: Could not insert project_code:', error.message);
      // Fallback query in case of parallel insert race
      const { data: fallback } = await coreDb
        .from('project_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      return fallback?.id || null;
    }

    return created?.id || null;
  } catch (err) {
    console.warn('EcosystemSync ensurePatentProjectCode error:', err?.message || err);
    return null;
  }
}

/**
 * Publishes a milestone or status change to core.matter_events and triggers billing stage auto-completion.
 */
export async function publishPatentMatterEvent({
  projectCode,
  projectCodeId,
  eventCode,
  title,
  detail,
  clientVisible = true,
  clientLabel,
  occurredAt,
  metadata = {},
}) {
  try {
    let pcId = projectCodeId;
    if (!pcId && projectCode) {
      const { data: pc } = await coreDb
        .from('project_codes')
        .select('id')
        .eq('code', projectCode.trim())
        .maybeSingle();
      pcId = pc?.id;
    }

    if (!pcId) {
      console.warn(`EcosystemSync: Cannot publish matter event without valid project code (${projectCode})`);
      return null;
    }

    const eventPayload = {
      project_code_id: pcId,
      event_code: eventCode || null,
      title: title || `Patent milestone: ${eventCode}`,
      detail: detail || null,
      occurred_at: occurredAt || new Date().toISOString(),
      source_app: 'IP_LEDGER',
      client_visible: Boolean(clientVisible),
      client_label: clientLabel || null,
      metadata: metadata || {},
    };

    const { data, error } = await coreDb
      .from('matter_events')
      .insert(eventPayload)
      .select()
      .single();

    if (error) {
      console.warn('EcosystemSync: publishPatentMatterEvent error:', error.message);
      return null;
    }

    // Trigger auto billing stages in Finance
    try {
      await financeDb.rpc('sync_matter_events_to_billing_stages');
    } catch (finErr) {
      // Non-blocking
    }

    return data;
  } catch (err) {
    console.warn('EcosystemSync publishPatentMatterEvent error:', err?.message || err);
    return null;
  }
}

/**
 * Records an official government or court filing fee into core.recoverable_costs for Finance.
 */
export async function recordOfficialGovtFee({
  projectCode,
  description,
  amount,
  costDate,
  category = 'OFFICIAL_FEE',
}) {
  try {
    const { data: pc } = await coreDb
      .from('project_codes')
      .select('id, client_id')
      .eq('code', projectCode.trim())
      .maybeSingle();

    if (!pc || !pc.id) {
      console.warn(`EcosystemSync: Cannot record govt fee without project code (${projectCode})`);
      return null;
    }

    const { data, error } = await coreDb
      .from('recoverable_costs')
      .insert({
        source_app: 'IP_LEDGER',
        source_type: 'GOVT_FEE',
        project_code_id: pc.id,
        client_id: pc.client_id,
        cost_date: costDate || new Date().toISOString().split('T')[0],
        category: category,
        description: description,
        amount: Number(amount),
        posting_status: 'PENDING_FINANCE',
      })
      .select()
      .single();

    if (error) {
      console.warn('EcosystemSync: recordOfficialGovtFee error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('EcosystemSync recordOfficialGovtFee error:', err?.message || err);
    return null;
  }
}
