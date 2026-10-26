-- =========================================================================
-- LEXTRIA ECOSYSTEM: PATENT AUDIT LOGS, TAGS & DEADLINE ACTIONS
-- Migration: 0201_patent_audit_and_tags.sql
-- Description: Audit history, custom tag definitions, action checklist,
--              and Zoho integrations for Patent Dashboard.
-- Guardrail: 100% NON-DESTRUCTIVE. Never touches public or other schemas.
-- =========================================================================

CREATE SCHEMA IF NOT EXISTS patent;

-- 1. Custom Tags Registry
CREATE TABLE IF NOT EXISTS patent.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial firm tags
INSERT INTO patent.tags (name, color, description)
VALUES 
  ('Priority', '#EF4444', 'High priority application requiring expedited drafting or filing'),
  ('Ticket Raised', '#F59E0B', 'Active support ticket or query raised by client/inventor'),
  ('Critical', '#DC2626', 'Approaching statutory abandonment deadline under Section 9 or 21'),
  ('Political', '#8B5CF6', 'Institutionally sensitive matter (VIP inventor or strategic IP)')
ON CONFLICT (name) DO NOTHING;

-- 2. Audit History & Logs
CREATE TABLE IF NOT EXISTS patent.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES patent.applications(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, STATUS_CHANGE, DEADLINE_TICK, TAG_ADD
  changed_by TEXT NOT NULL, -- User display name or email
  user_role TEXT NOT NULL DEFAULT 'STAFF',
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patent_audit_app ON patent.audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_patent_audit_code ON patent.audit_logs(project_code);
CREATE INDEX IF NOT EXISTS idx_patent_audit_date ON patent.audit_logs(created_at DESC);

-- 3. Action-based Deadlines Checklist
CREATE TABLE IF NOT EXISTS patent.deadline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES patent.applications(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  deadline_type TEXT NOT NULL, -- CS_FILING, FORM_1, FORM_26, FORM_3, FER_REPLY, HEARING_WS, RFE, ANNUITY
  title TEXT NOT NULL,
  statutory_ref TEXT NOT NULL,
  due_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  receipt_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patent_actions_due ON patent.deadline_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_patent_actions_code ON patent.deadline_actions(project_code);

-- 4. Firm Settings & Zoho Integrations
CREATE TABLE IF NOT EXISTS patent.settings (
  id TEXT PRIMARY KEY DEFAULT 'firm_settings',
  zoho_cliq_webhook_url TEXT,
  zoho_cliq_channel TEXT DEFAULT 'patent-deadlines',
  zoho_calendar_url TEXT,
  reminder_days INT[] DEFAULT ARRAY[30, 15, 7, 1],
  custom_tags JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant permissions to PostgREST roles
GRANT USAGE ON SCHEMA patent TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA patent TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA patent TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
