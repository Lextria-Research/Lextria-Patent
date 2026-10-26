-- =========================================================================
-- LEXTRIA ECOSYSTEM: PATENT PROSECUTION & PORTFOLIO MANAGEMENT MIGRATION
-- Migration: 0200_patent_schema.sql
-- Description: Creates isolated 'patent' schema, normalized tables, triggers,
--              statutory deadline generators, RLS policies, and relational
--              bridges to core.project_codes, core.clients, and litigator.linked_ip.
-- Guardrail: 100% NON-DESTRUCTIVE. Never touches public.lextria_state or existing tables.
-- =========================================================================

-- 1. Create isolated 'patent' schema
CREATE SCHEMA IF NOT EXISTS patent;

-- Grant usage to authenticated and service_role
GRANT USAGE ON SCHEMA patent TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA patent GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA patent GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA patent GRANT SELECT ON TABLES TO anon;

-- =========================================================================
-- 2. CORE APPLICATION MASTER TABLE: patent.applications
-- =========================================================================
CREATE TABLE IF NOT EXISTS patent.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Universal relational cross-dashboard keys
  project_code TEXT NOT NULL UNIQUE, -- e.g. AR01, AR431, PH01, EX-OR01
  project_code_id UUID REFERENCES core.project_codes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES core.clients(id) ON DELETE SET NULL,
  
  -- Portfolio Classification
  record_category TEXT NOT NULL DEFAULT 'INTERNAL_FILING' CHECK (record_category IN ('INTERNAL_FILING', 'EXTERNAL_TAKEOVER', 'WORKSHOP_IDF')),
  application_number TEXT, -- 12 digit IPO format (e.g. 202541073225)
  patent_number TEXT,     -- Populated on grant
  title TEXT NOT NULL,
  specification_type TEXT NOT NULL DEFAULT 'PS' CHECK (specification_type IN ('PS', 'CS', 'PS_TO_CS', 'DIVISIONAL', 'PATENT_OF_ADDITION')),
  classification TEXT,    -- Domain / Technical Field
  
  -- Applicant Details
  applicant_name TEXT NOT NULL,
  applicant_address TEXT,
  is_mahe BOOLEAN NOT NULL DEFAULT TRUE,
  entity_category TEXT NOT NULL DEFAULT 'EDUCATIONAL_INSTITUTION' CHECK (entity_category IN (
    'EDUCATIONAL_INSTITUTION', 'STARTUP_DPIIT', 'SMALL_ENTITY_UDYAM', 'INDIVIDUAL', 'LARGE_ENTITY'
  )),
  
  -- Workflow & Responsible Parties
  external_attorney TEXT, -- For EXTERNAL_TAKEOVER cases: Origiin, OMS, Tek IP, ALMT, Formulate
  assigned_to TEXT,       -- Internal drafter / associate
  filed_by TEXT,          -- Registered Patent Agent
  
  -- Status & Visual Triage
  application_filing_receipt_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (application_filing_receipt_status IN ('RECEIVED', 'NOT_RECEIVED', 'PENDING')),
  communication_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (communication_status IN ('OPEN', 'CLOSE', 'PENDING_INVENTOR')),
  current_status TEXT NOT NULL DEFAULT 'PS Not Yet Filed',
  is_abandoned BOOLEAN NOT NULL DEFAULT FALSE,
  color_code_status TEXT NOT NULL DEFAULT 'PURPLE' CHECK (color_code_status IN ('PURPLE', 'GREEN', 'RED', 'YELLOW', 'ORANGE', 'BLUE', 'GREY')),
  
  -- Vault & De-normalized helpers
  workdrive_folder_url TEXT,
  inventors_summary TEXT, -- Instant search without join on 4,000+ rows
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text and lookup indexes
CREATE INDEX IF NOT EXISTS idx_patent_applications_project_code ON patent.applications(project_code);
CREATE INDEX IF NOT EXISTS idx_patent_applications_app_number ON patent.applications(application_number);
CREATE INDEX IF NOT EXISTS idx_patent_applications_status ON patent.applications(current_status);
CREATE INDEX IF NOT EXISTS idx_patent_applications_assigned_to ON patent.applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_patent_applications_is_mahe ON patent.applications(is_mahe);
CREATE INDEX IF NOT EXISTS idx_patent_applications_color_code ON patent.applications(color_code_status);
CREATE INDEX IF NOT EXISTS idx_patent_applications_title_trgm ON patent.applications USING gin(to_tsvector('english', title));

-- =========================================================================
-- 3. NORMALIZED INVENTORS: patent.inventors & patent.application_inventors
-- =========================================================================
CREATE TABLE IF NOT EXISTS patent.inventors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  institution_department TEXT,
  campus_location TEXT, -- MPL (Manipal), MLR (Mangalore), BLR (Bengaluru), etc.
  address TEXT,
  nationality TEXT DEFAULT 'Indian',
  country_of_residence TEXT DEFAULT 'India',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patent_inventors_name ON patent.inventors(full_name);
CREATE INDEX IF NOT EXISTS idx_patent_inventors_email ON patent.inventors(email);

CREATE TABLE IF NOT EXISTS patent.application_inventors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES patent.applications(id) ON DELETE CASCADE,
  inventor_id UUID NOT NULL REFERENCES patent.inventors(id) ON DELETE CASCADE,
  inventor_order INT NOT NULL DEFAULT 1,
  is_point_of_contact BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(application_id, inventor_id)
);

CREATE INDEX IF NOT EXISTS idx_patent_app_inventors_app ON patent.application_inventors(application_id);
CREATE INDEX IF NOT EXISTS idx_patent_app_inventors_inv ON patent.application_inventors(inventor_id);

-- =========================================================================
-- 4. PROSECUTION LIFECYCLE & STATUTORY DEADLINES: patent.prosecution_dates
-- =========================================================================
CREATE TABLE IF NOT EXISTS patent.prosecution_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES patent.applications(id) ON DELETE CASCADE,
  
  -- Priority / Filing & Post-Dating (Section 17)
  ps_filing_date DATE,
  post_date_allowed BOOLEAN DEFAULT FALSE,
  post_dated_date DATE,
  remaining_post_date_days INT DEFAULT 181,
  cs_filing_date DATE,
  cs_deadline DATE GENERATED ALWAYS AS (
    COALESCE(post_dated_date, ps_filing_date) + INTERVAL '12 months'
  ) STORED,
  
  -- Publication & Examination (Section 11A & 11B)
  publication_date DATE,
  publication_number TEXT,
  rfe_filed BOOLEAN DEFAULT FALSE,
  rfe_filing_date DATE,
  rfe_deadline DATE, -- 31 months (post 15-Mar-2024) or 48 months from priority
  
  -- First Examination Report (FER)
  fer_notice_date DATE,
  fer_reply_filing_date DATE,
  fer_reply_deadline DATE GENERATED ALWAYS AS (
    fer_notice_date + INTERVAL '6 months'
  ) STORED,
  fer_extension_months INT DEFAULT 0, -- Form 4 up to 3 months extension
  
  -- Hearing & Written Submissions (Rule 28(7))
  hearing_notice_date DATE,
  hearing_date DATE,
  ws_filing_date DATE,
  ws_deadline DATE GENERATED ALWAYS AS (
    hearing_date + INTERVAL '15 days'
  ) STORED,
  ws_extension_days INT DEFAULT 0,
  
  -- Grant & Renewals (Section 53)
  grant_date DATE,
  refusal_date DATE,
  last_renewal_date DATE,
  next_renewal_date DATE,
  current_annuity_year INT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patent_dates_cs_deadline ON patent.prosecution_dates(cs_deadline);
CREATE INDEX IF NOT EXISTS idx_patent_dates_fer_deadline ON patent.prosecution_dates(fer_reply_deadline);
CREATE INDEX IF NOT EXISTS idx_patent_dates_hearing_date ON patent.prosecution_dates(hearing_date);
CREATE INDEX IF NOT EXISTS idx_patent_dates_ws_deadline ON patent.prosecution_dates(ws_deadline);
CREATE INDEX IF NOT EXISTS idx_patent_dates_next_renewal ON patent.prosecution_dates(next_renewal_date);

-- =========================================================================
-- 5. STATUTORY FORMS TRACKER & DELAYS: patent.forms_tracker
-- =========================================================================
CREATE TABLE IF NOT EXISTS patent.forms_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES patent.applications(id) ON DELETE CASCADE,
  
  -- Form 1: Proof of Right (6 months from filing date)
  form_1_filing_date DATE,
  form_1_deadline DATE,
  f1_delayed_by TEXT,
  f1_delay_days INT DEFAULT 0,
  f1_status TEXT DEFAULT 'Pending' CHECK (f1_status IN ('Within Deadline', 'Delayed', 'Pending', 'Exempt')),
  
  -- Form 26: Power of Attorney (3 months from filing date)
  form_26_filing_date DATE,
  form_26_deadline DATE,
  f26_delayed_by TEXT,
  f26_delay_days INT DEFAULT 0,
  f26_status TEXT DEFAULT 'Pending' CHECK (f26_status IN ('Within Deadline', 'Delayed', 'Pending', 'Exempt')),
  
  -- Form 3: Section 8 Foreign Filing Undertaking
  form_3_filing_date DATE,
  form_3_deadline DATE,
  
  -- Miscellaneous Statutory Filings
  form_5_filing_date DATE, -- Inventorship Declaration
  form_9_filing_date DATE, -- Early Publication
  form_18_filing_date DATE, -- Normal / Expedited Examination Request
  form_28_filing_date DATE, -- Small Entity / Startup / Educational Declaration
  
  -- Amendments
  form_6_filing_date DATE,  -- Change in Applicant
  form_8_filing_date DATE,  -- Addition of Inventor
  form_8a_filing_date DATE, -- Mention of Inventor
  form_13_filing_date DATE, -- Amendment of Application / Specification
  form_13_particulars TEXT,
  
  -- Extensions & Petitions
  form_4_fer_filing_date DATE,
  form_4_ws_filing_date DATE,
  form_4_form_3_filing_date DATE,
  petition_137_filed BOOLEAN DEFAULT FALSE,
  petition_138_filed BOOLEAN DEFAULT FALSE,
  
  -- Post-Grant & Response to Office Actions
  form_24_filing_date DATE,
  form_27_filing_date DATE, -- Working Statement
  form_30_response_to_oa_date DATE,
  form_30_withdrawal_date DATE,
  form_30_hearing_interest_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 6. MANUAL DUES STORAGE & EDITABLE NOTES: patent.dues_manual
-- =========================================================================
CREATE TABLE IF NOT EXISTS patent.dues_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES patent.applications(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  type_of_due TEXT NOT NULL CHECK (type_of_due IN (
    'PS-CS', 'FORM 1', 'FORM 26', 'FER', 'FORM 3', 'FORM 18', 'HEARING', 'WRITTEN SUBMISSION', 'RENEWAL'
  )),
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('completed', 'overdue', 'pending')),
  assigned_to TEXT,
  status_notes TEXT,
  suggested_action TEXT,
  issue TEXT,
  checklist_sent_date DATE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_code, type_of_due, due_date)
);

CREATE INDEX IF NOT EXISTS idx_patent_dues_lookup ON patent.dues_manual(project_code, type_of_due, due_date);

-- =========================================================================
-- 7. AUDIT QUERIES & DISCREPANCIES: patent.comments_queries
-- =========================================================================
CREATE TABLE IF NOT EXISTS patent.comments_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES patent.applications(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN (
    'GENERAL', 'PORTAL_DISCREPANCY', 'INVENTOR_QUERY', 'TTO_QUERY', 'NBA_APPROVAL', 'PRIOR_ART'
  )),
  query_text TEXT NOT NULL,
  query_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (query_status IN (
    'OPEN', 'RESOLVED', 'WAITING_ON_INVENTOR', 'WAITING_ON_TTO'
  )),
  created_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patent_queries_app ON patent.comments_queries(application_id);

-- =========================================================================
-- 8. ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE patent.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent.inventors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent.application_inventors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent.prosecution_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent.forms_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent.dues_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE patent.comments_queries ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and service_role
CREATE POLICY "Allow read to authenticated and service_role" ON patent.applications
  FOR SELECT TO authenticated, service_role USING (true);
CREATE POLICY "Allow all to service_role" ON patent.applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow modify to authenticated" ON patent.applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Repeat for related tables
CREATE POLICY "Allow read/write" ON patent.inventors FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write" ON patent.application_inventors FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write" ON patent.prosecution_dates FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write" ON patent.forms_tracker FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write" ON patent.dues_manual FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow read/write" ON patent.comments_queries FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);

-- Convenience public read policy for prototype/dev
CREATE POLICY "Allow anon read" ON patent.applications FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read" ON patent.prosecution_dates FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read" ON patent.forms_tracker FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read" ON patent.dues_manual FOR ALL TO anon USING (true) WITH CHECK (true);

-- =========================================================================
-- 9. MASTER CONSOLIDATED VIEW: patent.v_patent_master
--    Powers the TanStack Table Grid with instant single-query performance
-- =========================================================================
CREATE OR REPLACE VIEW patent.v_patent_master AS
SELECT 
  a.id,
  a.project_code,
  a.project_code_id,
  a.client_id,
  a.record_category,
  a.application_number,
  a.patent_number,
  a.title,
  a.specification_type,
  a.classification,
  a.applicant_name,
  a.applicant_address,
  a.is_mahe,
  a.entity_category,
  a.external_attorney,
  a.assigned_to,
  a.filed_by,
  a.application_filing_receipt_status,
  a.communication_status,
  a.current_status,
  a.is_abandoned,
  a.color_code_status,
  a.workdrive_folder_url,
  a.inventors_summary,
  
  -- Prosecution Dates
  d.ps_filing_date,
  d.post_date_allowed,
  d.post_dated_date,
  d.remaining_post_date_days,
  d.cs_filing_date,
  d.cs_deadline,
  d.publication_date,
  d.publication_number,
  d.rfe_filed,
  d.rfe_filing_date,
  d.rfe_deadline,
  d.fer_notice_date,
  d.fer_reply_filing_date,
  d.fer_reply_deadline,
  d.hearing_date,
  d.ws_filing_date,
  d.ws_deadline,
  d.grant_date,
  d.refusal_date,
  d.last_renewal_date,
  d.next_renewal_date,
  d.current_annuity_year,
  
  -- Forms
  f.form_1_filing_date,
  f.form_1_deadline,
  f.f1_delayed_by,
  f.f1_status,
  f.form_26_filing_date,
  f.form_26_deadline,
  f.f26_delayed_by,
  f.f26_status,
  f.form_3_filing_date,
  f.form_3_deadline,
  f.form_9_filing_date,
  f.form_18_filing_date,
  f.form_13_filing_date,
  f.form_13_particulars,
  f.petition_137_filed,
  f.petition_138_filed,
  
  -- Timestamps
  a.created_at,
  a.updated_at
FROM patent.applications a
LEFT JOIN patent.prosecution_dates d ON d.application_id = a.id
LEFT JOIN patent.forms_tracker f ON f.application_id = a.id;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

