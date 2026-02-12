-- Updated Storage Bucket and RLS Policies

-- Adding missing anon read policy
CREATE POLICY "anon_read_policy"
ON storage.buckets
FOR SELECT
USING (true);

-- Adding authenticated delete policy
CREATE POLICY "authenticated_delete_policy"
ON storage.buckets
FOR DELETE
USING (auth.role() = 'authenticated');