-- Moderators have a moderation UI (apps/web/src/app/moderation/report-actions.ts)
-- that hides/unhides and deletes posts in their commune, but the original RLS
-- policies only allowed admins to UPDATE/DELETE posts. Moderators' actions
-- silently affected zero rows. These policies fix that.

CREATE POLICY "Moderators can update posts in own commune"
  ON "public"."posts"
  FOR UPDATE TO "authenticated"
  USING (
    "commune_id" = "public"."auth_commune_id"()
    AND "public"."is_commune_moderator"()
  )
  WITH CHECK (
    "commune_id" = "public"."auth_commune_id"()
    AND "public"."is_commune_moderator"()
  );

CREATE POLICY "Moderators can delete posts in own commune"
  ON "public"."posts"
  FOR DELETE TO "authenticated"
  USING (
    "commune_id" = "public"."auth_commune_id"()
    AND "public"."is_commune_moderator"()
  );
