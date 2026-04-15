-- New columns on communes
ALTER TABLE communes ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';
ALTER TABLE communes ADD COLUMN IF NOT EXISTS custom_primary_color TEXT;
ALTER TABLE communes ADD COLUMN IF NOT EXISTS associations JSONB DEFAULT '[]';

-- Drop unused column
ALTER TABLE communes DROP COLUMN IF EXISTS primary_color;

-- Council documents table
CREATE TABLE IF NOT EXISTS council_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('deliberation', 'pv', 'compte_rendu')),
  document_date DATE NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_council_documents_commune_id ON council_documents(commune_id);

ALTER TABLE council_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view council documents"
  ON council_documents FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert council documents"
  ON council_documents FOR INSERT TO authenticated
  WITH CHECK (
    commune_id = auth_commune_id() AND is_commune_admin()
  );

CREATE POLICY "Admins can delete council documents"
  ON council_documents FOR DELETE TO authenticated
  USING (
    commune_id = auth_commune_id() AND is_commune_admin()
  );

-- Council documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('council-documents', 'council-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload council documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'council-documents');

CREATE POLICY "Anyone can view council documents files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'council-documents');

CREATE POLICY "Admins can delete council documents files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'council-documents');
