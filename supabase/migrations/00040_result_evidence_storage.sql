/*
 * This migration adds storage for result evidence photos.
 */

-- Photos are stored under the uploader's own folder with unguessable names. The
-- result keeps the public URL in evidence_url so the host can review it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'result-evidence',
  'result-evidence',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Result evidence is publicly readable" ON storage.objects;
CREATE POLICY "Result evidence is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'result-evidence');

DROP POLICY IF EXISTS "Users can upload their own result evidence" ON storage.objects;
CREATE POLICY "Users can upload their own result evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'result-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own result evidence" ON storage.objects;
CREATE POLICY "Users can delete their own result evidence"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'result-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
