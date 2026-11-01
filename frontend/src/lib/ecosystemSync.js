// frontend/src/lib/ecosystemSync.js
// Lextria Ecosystem Interlinking: Patent Dashboard <-> Central Core & Finance
import { coreDb, financeDb } from './supabase.js';

export const MAHE_CLIENT_ID = 'c0736c22-db5e-4bd1-b7f5-5facc08d865e';
export const INDEP_CLIENT_ID = '213f9e73-6f5e-4cef-8dec-23ba9c834e3b';
export const AAI_CLIENT_ID = 'd224d523-bc5c-4e06-a6ae-c5b9973bfdbe';

/**
 * Resolves appropriate client ID from applicant name and MAHE flag.
 */
export function resolveClientId(applicantName = '', isMahe = false) {
  if (isMahe) return MAHE_CLIENT_ID;
  const upper = (applicantName || '').toUpperCase();
  if (upper.includes('MANIPAL')) return MAHE_CLIENT_ID;
  if (upper.includes('AAIS') || upper.includes('ASTRAEA')) return AAI_CLIENT_ID;
  if (upper.includes('INDEPENDENT')) return INDEP_CLIENT_ID;
  return INDEP_CLIENT_ID;
}

/**
 * Ensures a patent project code exists in core.project_codes and returns its UUID.
 */
export async function ensurePatentProjectCode(record) {
  if (!record || !record.project_code) return null;
  const code = record.project_code.trim();

  try {
    // 1. Check if already exists in core.project_codes
    const { data: existing } = await coreDb
      .from('project_codes')
      .select('id, client_id, status')
      .eq('code', code)
      .maybeSingle();

    if (existing && existing.id) {
      // Sync status if abandonment changed
      const expectedStatus = record.is_abandoned ? 'ABANDONED' : 'ACTIVE';
      if (existing.status !== expectedStatus) {
        await coreDb
          .from('project_codes')
          .update({ status: expectedStatus, title: record.title || code })
          .eq('id', existing.id);
      }
      return existing.id;
    }

    // 2. Create in core.project_codes
    const resolvedClientId = record.client_id || resolveClientId(record.applicant_name, record.is_mahe);
    const { data: created, error } = await coreDb
      .from('project_codes')
      .insert({
        code: code,
        department: 'IP_PATENT',
        client_id: resolvedClientId,
        title: record.title || `Patent Application ${code}`,
        status: record.is_abandoned ? 'ABANDONED' : 'ACTIVE',
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
