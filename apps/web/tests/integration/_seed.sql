-- Minimal deterministic seed for integration tests. Run after TRUNCATE.
-- Auth users are NOT seeded here — they survive across tests because
-- creating users via supabase auth admin is slow. Use the matching
-- emails/passwords from supabase/seed.sql.

INSERT INTO communes (id, name, slug, code_postal, theme, motto, invite_code)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Saint-Médard',
  'saint-medard-64',
  '64370',
  'terre_doc',
  'Entre mer et montagne, au cœur du Béarn',
  'stmed1'
);

INSERT INTO profiles (id, commune_id, display_name, role, status)
VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'Secrétariat Mairie', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', 'Sophie Dupin', 'resident', 'active'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Pierre Moreau', 'resident', 'active');
