# Supabase Configuration & Verification Plan

Based on the system review, we are using **Supabase Storage** (not SQL Base64 storage) to handle file uploads. This is the correct and recommended approach. The codebase is configured to use a storage bucket named `applications`. To ensure the system works end-to-end, we must verify that the Supabase backend configuration matches our code expectations. Specifically, the storage bucket must be created with the exact case-sensitive name `applications`, and Row Level Security (RLS) policies must be explicitly enabled to allow anonymous users (the public form) to upload files, while restricting read access to authenticated administrators only.

## Action Checklist

- [ ] **Execute Setup Script**: Run the contents of `supabase_setup.sql` in the Supabase SQL Editor to create the table and storage bucket automatically.
- [ ] **Verify Storage Bucket**: Go to Supabase Dashboard → Storage and confirm a bucket named `applications` exists.
- [ ] **Check Storage Policies**: Verify that the `applications` bucket has an "Insert" policy allowing `anon` (public) uploads.
- [ ] **Check Table Schema**: Confirm the `applications` table exists in the Table Editor and has columns for file paths (e.g., `id_copy_path`, `payslip_path`) matching the code.
- [ ] **Test Upload**: Perform a test submission on the live site to confirm files appear in the storage bucket.
