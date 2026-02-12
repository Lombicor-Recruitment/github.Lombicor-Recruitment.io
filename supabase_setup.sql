-- ============================================================
--  UPDATED SUPABASE SETUP SCRIPT (With Admin Edit/Delete)
-- ============================================================

-- 1. APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id                BIGSERIAL PRIMARY KEY,
  ref_id            TEXT        NOT NULL UNIQUE,
  first_name        TEXT        NOT NULL,
  surname           TEXT        NOT NULL,
  id_number         TEXT        NOT NULL,
  race              TEXT,
  gender            TEXT,
  contact_number    TEXT        NOT NULL,
  address           TEXT,

  -- File paths in Storage bucket
  id_copy_path      TEXT,
  proof_sars_path   TEXT,
  proof_bank_path   TEXT,

  -- Experience
  packhouse_exp     BOOLEAN     DEFAULT FALSE,
  payslip_path      TEXT,

  -- Forklift
  forklift_licence  BOOLEAN     DEFAULT FALSE,
  forklift_doc_path TEXT,

  submitted_at      TIMESTAMPTZ DEFAULT NOW()
);


-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 2.1 Allow Public to Submit Forms (Insert Only)
-- Drop policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Allow public insert" ON applications;
CREATE POLICY "Allow public insert"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 2.2 Allow Admin Full Access (Read, Edit, Delete)
-- Drop old restrictive policy if it exists
DROP POLICY IF EXISTS "Authenticated read" ON applications;
DROP POLICY IF EXISTS "Admin full access" ON applications;

CREATE POLICY "Admin full access"
  ON applications
  FOR ALL                 -- << CHANGED: Allows SELECT, INSERT, UPDATE, DELETE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 3. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

-- 3.1 Allow Public to Upload Files
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
CREATE POLICY "Allow anon uploads"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'applications');

-- 3.2 Allow Admin to Read Files
DROP POLICY IF EXISTS "Authenticated can read files" ON storage.objects;
CREATE POLICY "Authenticated can read files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'applications');
