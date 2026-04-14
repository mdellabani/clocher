-- 004_moderation.sql
-- Moderation: reports, audit log, word filter, moderator role, feed pagination support

-- 1. Extend profile roles to include 'moderator'
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('resident', 'moderator', 'admin', 'epci_admin'));

-- 2. Add is_hidden to posts (for moderation hiding without deletion)
ALTER TABLE posts ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;

-- 3. Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  category TEXT NOT NULL CHECK (category IN ('inapproprie', 'spam', 'illegal', 'doublon', 'autre')),
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'dismissed', 'actioned')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, reporter_id)
);

CREATE INDEX idx_reports_post_id ON reports(post_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- 4. Audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_commune ON audit_log(commune_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- 5. Word filters table
CREATE TABLE word_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Seed default banned words
INSERT INTO word_filters (word) VALUES
  ('cannabis'), ('cocaïne'), ('cocaine'), ('héroïne'), ('heroine'),
  ('crack'), ('dealer'), ('drogue'), ('stupéfiant'), ('shit'),
  ('meth'), ('amphétamine'), ('ecstasy'), ('mdma'), ('lsd'),
  ('pute'), ('salope'), ('enculé'), ('nègre'), ('négro'),
  ('bougnoule'), ('youpin'), ('pd'), ('tapette'), ('gouine'),
  ('meurtre'), ('tuer'), ('buter'), ('crever'),
  ('escroquerie'), ('arnaque'),
  ('pédophile'), ('viol'), ('violer');

-- 7. Helper function: is user a moderator or admin?
CREATE OR REPLACE FUNCTION is_commune_moderator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'epci_admin') AND status = 'active'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8. Auto-hide trigger: hide post when it reaches 3 pending reports
CREATE OR REPLACE FUNCTION check_report_threshold() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT count(*) FROM reports WHERE post_id = NEW.post_id AND status = 'pending') >= 3 THEN
    UPDATE posts SET is_hidden = true WHERE id = NEW.post_id;
    INSERT INTO audit_log (commune_id, actor_id, action, target_type, target_id, reason)
    SELECT p.commune_id, NULL, 'post_hidden', 'post', p.id, 'Seuil de signalements atteint (3)'
    FROM posts p WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_report_threshold
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION check_report_threshold();

-- 9. RLS: Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id AND is_approved());

CREATE POLICY "reports_select" ON reports FOR SELECT USING (
  reporter_id = auth.uid()
  OR is_commune_moderator()
);

CREATE POLICY "reports_update" ON reports FOR UPDATE USING (
  is_commune_moderator()
);

-- 10. RLS: Audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_log FOR SELECT USING (
  commune_id = auth_commune_id()
  AND (is_commune_admin() OR actor_id = auth.uid())
);

CREATE POLICY "audit_insert" ON audit_log FOR INSERT WITH CHECK (
  is_commune_moderator()
  OR actor_id IS NULL
);

-- 11. RLS: Word filters (read-only for all authenticated)
ALTER TABLE word_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_filters_select" ON word_filters FOR SELECT USING (true);

-- 12. Add index for feed pagination (cursor-based)
CREATE INDEX idx_posts_feed ON posts(commune_id, is_pinned DESC, created_at DESC)
  WHERE is_hidden = false;
