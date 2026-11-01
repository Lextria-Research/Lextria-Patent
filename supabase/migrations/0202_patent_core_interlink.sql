-- =========================================================================
-- LEXTRIA ECOSYSTEM: PATENT DASHBOARD CROSS-INTERLINKING MIGRATION
-- Migration: 0202_patent_core_interlink.sql
-- Description: Bridges all patent applications to core.project_codes,
--              ensures event_codes (FER_ISSUED, PATENT_GRANTED, PATENT_PUBLISHED),
--              and sets up automatic project code synchronization.
-- =========================================================================

-- 1. Ensure event codes exist in core.event_codes
INSERT INTO core.event_codes (code, domain, description, default_client_label)
VALUES
  ('FER_ISSUED', 'IP', 'First Examination Report issued by Patent Office', 'Examination report received'),
  ('PATENT_GRANTED', 'IP', 'Patent granted by the Patent Office', 'Patent granted'),
  ('PATENT_PUBLISHED', 'IP', 'Patent published in the official Patent Journal', 'Patent published')
ON CONFLICT (code) DO NOTHING;

-- 2. Trigger function to auto-sync patent applications to core.project_codes
CREATE OR REPLACE FUNCTION patent.sync_application_to_core_project_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = patent, core, public
AS $$
DECLARE
  v_pc_id UUID;
  v_client_id UUID;
  v_mahe_id CONSTANT UUID := 'c0736c22-db5e-4bd1-b7f5-5facc08d865e'::uuid;
  v_indep_id CONSTANT UUID := '213f9e73-6f5e-4cef-8dec-23ba9c834e3b'::uuid;
  v_aai_id CONSTANT UUID := 'd224d523-bc5c-4e06-a6ae-c5b9973bfdbe'::uuid;
BEGIN
  -- Resolve client_id if null
  IF NEW.client_id IS NOT NULL THEN
    v_client_id := NEW.client_id;
  ELSIF NEW.is_mahe OR UPPER(COALESCE(NEW.applicant_name, '')) LIKE '%MANIPAL%' THEN
    v_client_id := v_mahe_id;
  ELSIF UPPER(COALESCE(NEW.applicant_name, '')) LIKE '%AAIS%' OR UPPER(COALESCE(NEW.applicant_name, '')) LIKE '%ASTRAEA%' THEN
    v_client_id := v_aai_id;
  ELSE
    v_client_id := v_indep_id;
  END IF;

  -- Find or insert into core.project_codes
  SELECT id INTO v_pc_id
    FROM core.project_codes
   WHERE code_normalized = UPPER(TRIM(NEW.project_code))
   LIMIT 1;

  IF v_pc_id IS NULL THEN
    INSERT INTO core.project_codes (code, department, client_id, title, status, owning_app)
    VALUES (
      NEW.project_code,
      'IP_PATENT',
      v_client_id,
      COALESCE(NEW.title, 'Patent Application ' || NEW.project_code),
      CASE WHEN NEW.is_abandoned THEN 'ABANDONED' ELSE 'ACTIVE' END,
      'IP_LEDGER'
    )
    RETURNING id INTO v_pc_id;
  ELSE
    UPDATE core.project_codes
       SET title = COALESCE(NEW.title, title),
           status = CASE WHEN NEW.is_abandoned THEN 'ABANDONED' ELSE 'ACTIVE' END
     WHERE id = v_pc_id;
  END IF;

  NEW.project_code_id := v_pc_id;
  NEW.client_id := v_client_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_patent_to_core ON patent.applications;
CREATE TRIGGER trg_sync_patent_to_core
  BEFORE INSERT OR UPDATE OF project_code, title, is_abandoned, applicant_name
  ON patent.applications
  FOR EACH ROW
  EXECUTE FUNCTION patent.sync_application_to_core_project_code();

NOTIFY pgrst, 'reload schema';

