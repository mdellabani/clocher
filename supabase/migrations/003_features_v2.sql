-- 003_features_v2.sql
-- Features v2: service posts, producers, polls

-- 1. Extend post types to include 'service'
ALTER TABLE posts DROP CONSTRAINT posts_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_type_check
  CHECK (type IN ('annonce', 'evenement', 'entraide', 'discussion', 'service'));

-- 2. Add expiration column for service posts
ALTER TABLE posts ADD COLUMN expires_at TIMESTAMPTZ;

-- 3. Producers directory
CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  categories TEXT[] NOT NULL,
  photo_path TEXT,
  pickup_location TEXT,
  delivers BOOLEAN NOT NULL DEFAULT false,
  contact_phone TEXT,
  contact_email TEXT,
  schedule TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_producers_commune_id ON producers(commune_id);
CREATE INDEX idx_producers_status ON producers(status);

-- 4. Polls
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  poll_type TEXT NOT NULL CHECK (poll_type IN ('vote', 'participation')),
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INT NOT NULL
);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_option_id, user_id)
);

CREATE INDEX idx_poll_votes_option ON poll_votes(poll_option_id);
CREATE INDEX idx_poll_votes_user ON poll_votes(user_id);

-- 5. RLS: Producers
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "producers_select" ON producers FOR SELECT USING (
  (status = 'active' AND commune_id IN (
    SELECT c.id FROM communes c
    WHERE c.epci_id = (
      SELECT c2.epci_id FROM communes c2
      JOIN profiles p ON p.commune_id = c2.id
      WHERE p.id = auth.uid()
    )
  ))
  OR created_by = auth.uid()
  OR is_commune_admin()
);

CREATE POLICY "producers_insert" ON producers FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "producers_update" ON producers FOR UPDATE USING (
  created_by = auth.uid() OR is_commune_admin()
);

CREATE POLICY "producers_delete" ON producers FOR DELETE USING (
  created_by = auth.uid() OR is_commune_admin()
);

-- 6. RLS: Polls
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls_select" ON polls FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p
    JOIN profiles pr ON pr.commune_id = p.commune_id
    WHERE p.id = polls.post_id AND pr.id = auth.uid()
  )
);

CREATE POLICY "polls_insert" ON polls FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid()
  )
);

CREATE POLICY "polls_delete" ON polls FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid()
  )
  OR is_commune_admin()
);

CREATE POLICY "poll_options_select" ON poll_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM polls pl
    JOIN posts p ON p.id = pl.post_id
    JOIN profiles pr ON pr.commune_id = p.commune_id
    WHERE pl.id = poll_options.poll_id AND pr.id = auth.uid()
  )
);

CREATE POLICY "poll_options_insert" ON poll_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM polls pl
    JOIN posts p ON p.id = pl.post_id
    WHERE pl.id = poll_id AND p.author_id = auth.uid()
  )
);

CREATE POLICY "poll_votes_select" ON poll_votes FOR SELECT USING (true);

CREATE POLICY "poll_votes_insert" ON poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "poll_votes_delete" ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);
