-- ============================================================
--  SUPABASE SETUP SCRIPT
--  Run this in your Supabase project → SQL Editor
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


-- 2. ROW LEVEL SECURITY
-- ============================================================
-- Enable RLS on the table
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous INSERT (the public form submits without auth)
CREATE POLICY "Allow public insert"
  ON applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users (you) can SELECT / UPDATE / DELETE
CREATE POLICY "Authenticated read"
  ON applications
  FOR SELECT
  TO authenticated
  USING (true);


-- 3. STORAGE BUCKET
-- ============================================================
-- Create the storage bucket (run in SQL or do it in the dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('applications', 'applications', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anon to upload files into the bucket
CREATE POLICY "Allow anon uploads"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'applications');

-- Allow authenticated users to read/download files
CREATE POLICY "Authenticated can read files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'applications');


-- ============================================================
--  DONE!
--  Next steps:
--  1. Copy your Project URL and anon key from:
--     Supabase Dashboard → Project Settings → API
--  2. Paste them into index.html:
--       const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
--       const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
--  3. Push index.html to your GitHub repo and enable Pages.
-- ============================================================
