
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE OR REPLACE FUNCTION "public"."auth_commune_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT commune_id FROM profiles WHERE id = auth.uid()
$$;
ALTER FUNCTION "public"."auth_commune_id"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."check_report_threshold"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (SELECT count(*) FROM reports WHERE post_id = NEW.post_id AND status = 'pending') >= 3 THEN
    UPDATE posts SET is_hidden = true WHERE id = NEW.post_id;
    INSERT INTO audit_log (commune_id, actor_id, action, target_type, target_id, reason)
    SELECT p.commune_id, NULL, 'post_hidden', 'post', p.id, 'Seuil de signalements atteint (3)'
    FROM posts p WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."check_report_threshold"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_approved"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND status = 'active'
  )
$$;
ALTER FUNCTION "public"."is_approved"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_commune_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  )
$$;
ALTER FUNCTION "public"."is_commune_admin"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."is_commune_moderator"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'epci_admin') AND status = 'active'
  )
$$;
ALTER FUNCTION "public"."is_commune_moderator"() OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "commune_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."audit_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."communes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "epci_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "code_postal" "text",
    "logo_url" "text",
    "primary_color" "text" DEFAULT '#1e40af'::"text",
    "invite_code" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(6), 'hex'::"text") NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme" "text" DEFAULT 'terre_doc'::"text" NOT NULL,
    "motto" "text",
    "hero_image_url" "text",
    "description" "text",
    "blason_url" "text",
    "infos_pratiques" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "communes_theme_check" CHECK (("theme" = ANY (ARRAY['terre_doc'::"text", 'provence'::"text", 'atlantique'::"text", 'alpin'::"text", 'ble_dore'::"text", 'corse'::"text", 'champagne'::"text", 'ardoise'::"text"])))
);
ALTER TABLE "public"."communes" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."epci" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."epci" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."poll_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "position" integer NOT NULL
);
ALTER TABLE "public"."poll_options" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."poll_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poll_option_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."poll_votes" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."polls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "poll_type" "text" NOT NULL,
    "allow_multiple" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "polls_poll_type_check" CHECK (("poll_type" = ANY (ARRAY['vote'::"text", 'participation'::"text"])))
);
ALTER TABLE "public"."polls" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."post_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."post_images" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "commune_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "epci_visible" boolean DEFAULT false NOT NULL,
    "event_date" timestamp with time zone,
    "event_location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "is_hidden" boolean DEFAULT false NOT NULL,
    CONSTRAINT "posts_type_check" CHECK (("type" = ANY (ARRAY['annonce'::"text", 'evenement'::"text", 'entraide'::"text", 'discussion'::"text", 'service'::"text"])))
);
ALTER TABLE "public"."posts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."producers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "commune_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "categories" "text"[] NOT NULL,
    "photo_path" "text",
    "pickup_location" "text",
    "delivers" boolean DEFAULT false NOT NULL,
    "contact_phone" "text",
    "contact_email" "text",
    "schedule" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "producers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'rejected'::"text"])))
);
ALTER TABLE "public"."producers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "commune_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "role" "text" DEFAULT 'resident'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "push_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['resident'::"text", 'moderator'::"text", 'admin'::"text", 'epci_admin'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'rejected'::"text"])))
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reports_category_check" CHECK (("category" = ANY (ARRAY['inapproprie'::"text", 'spam'::"text", 'illegal'::"text", 'doublon'::"text", 'autre'::"text"]))),
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'dismissed'::"text", 'actioned'::"text"])))
);
ALTER TABLE "public"."reports" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."rsvps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rsvps_status_check" CHECK (("status" = ANY (ARRAY['going'::"text", 'maybe'::"text", 'not_going'::"text"])))
);
ALTER TABLE "public"."rsvps" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."word_filters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "word" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."word_filters" OWNER TO "postgres";
ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_invite_code_key" UNIQUE ("invite_code");

ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_slug_key" UNIQUE ("slug");

ALTER TABLE ONLY "public"."epci"
    ADD CONSTRAINT "epci_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."poll_options"
    ADD CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_poll_option_id_user_id_key" UNIQUE ("poll_option_id", "user_id");

ALTER TABLE ONLY "public"."polls"
    ADD CONSTRAINT "polls_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."polls"
    ADD CONSTRAINT "polls_post_id_key" UNIQUE ("post_id");

ALTER TABLE ONLY "public"."post_images"
    ADD CONSTRAINT "post_images_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."producers"
    ADD CONSTRAINT "producers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_post_id_reporter_id_key" UNIQUE ("post_id", "reporter_id");

ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_post_id_user_id_key" UNIQUE ("post_id", "user_id");

ALTER TABLE ONLY "public"."word_filters"
    ADD CONSTRAINT "word_filters_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."word_filters"
    ADD CONSTRAINT "word_filters_word_key" UNIQUE ("word");

CREATE INDEX "idx_audit_log_actor" ON "public"."audit_log" USING "btree" ("actor_id");

CREATE INDEX "idx_audit_log_commune" ON "public"."audit_log" USING "btree" ("commune_id");

CREATE INDEX "idx_audit_log_created" ON "public"."audit_log" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_comments_post_id" ON "public"."comments" USING "btree" ("post_id");

CREATE INDEX "idx_communes_epci_id" ON "public"."communes" USING "btree" ("epci_id");

CREATE INDEX "idx_communes_slug" ON "public"."communes" USING "btree" ("slug");

CREATE INDEX "idx_poll_votes_option" ON "public"."poll_votes" USING "btree" ("poll_option_id");

CREATE INDEX "idx_poll_votes_user" ON "public"."poll_votes" USING "btree" ("user_id");

CREATE INDEX "idx_posts_commune_id" ON "public"."posts" USING "btree" ("commune_id");

CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_posts_feed" ON "public"."posts" USING "btree" ("commune_id", "is_pinned" DESC, "created_at" DESC) WHERE ("is_hidden" = false);

CREATE INDEX "idx_posts_type" ON "public"."posts" USING "btree" ("type");

CREATE INDEX "idx_producers_commune_id" ON "public"."producers" USING "btree" ("commune_id");

CREATE INDEX "idx_producers_status" ON "public"."producers" USING "btree" ("status");

CREATE INDEX "idx_profiles_commune_id" ON "public"."profiles" USING "btree" ("commune_id");

CREATE INDEX "idx_reports_post_id" ON "public"."reports" USING "btree" ("post_id");

CREATE INDEX "idx_reports_reporter" ON "public"."reports" USING "btree" ("reporter_id");

CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");

CREATE INDEX "idx_rsvps_post_id" ON "public"."rsvps" USING "btree" ("post_id");

CREATE OR REPLACE TRIGGER "posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();

CREATE OR REPLACE TRIGGER "trigger_report_threshold" AFTER INSERT ON "public"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."check_report_threshold"();

ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id");

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."communes"
    ADD CONSTRAINT "communes_epci_id_fkey" FOREIGN KEY ("epci_id") REFERENCES "public"."epci"("id");

ALTER TABLE ONLY "public"."poll_options"
    ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_poll_option_id_fkey" FOREIGN KEY ("poll_option_id") REFERENCES "public"."poll_options"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."poll_votes"
    ADD CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."polls"
    ADD CONSTRAINT "polls_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."post_images"
    ADD CONSTRAINT "post_images_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id");

ALTER TABLE ONLY "public"."producers"
    ADD CONSTRAINT "producers_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id");

ALTER TABLE ONLY "public"."producers"
    ADD CONSTRAINT "producers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_commune_id_fkey" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."rsvps"
    ADD CONSTRAINT "rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");

CREATE POLICY "Admins can delete comments in own commune" ON "public"."comments" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "comments"."post_id") AND ("posts"."commune_id" = "public"."auth_commune_id"())))) AND "public"."is_commune_admin"()));

CREATE POLICY "Admins can update posts in own commune" ON "public"."posts" FOR UPDATE TO "authenticated" USING ((("commune_id" = "public"."auth_commune_id"()) AND "public"."is_commune_admin"()));

CREATE POLICY "Admins can update profiles in own commune" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("commune_id" = "public"."auth_commune_id"()) AND "public"."is_commune_admin"()));

CREATE POLICY "Anon can view communes by slug" ON "public"."communes" FOR SELECT TO "anon" USING (true);

CREATE POLICY "Anon can view post images for public website" ON "public"."post_images" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_images"."post_id") AND (("posts"."type" = 'annonce'::"text") OR ("posts"."type" = 'evenement'::"text"))))));

CREATE POLICY "Anon can view posts for public website" ON "public"."posts" FOR SELECT TO "anon" USING ((("type" = 'annonce'::"text") OR ("type" = 'evenement'::"text")));

CREATE POLICY "Approved users can create RSVPs" ON "public"."rsvps" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_approved"()));

CREATE POLICY "Approved users can create comments" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND "public"."is_approved"() AND (EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "comments"."post_id") AND ("posts"."commune_id" = "public"."auth_commune_id"()))))));

CREATE POLICY "Approved users can create posts" ON "public"."posts" FOR INSERT TO "authenticated" WITH CHECK ((("author_id" = "auth"."uid"()) AND ("commune_id" = "public"."auth_commune_id"()) AND "public"."is_approved"() AND (("type" <> 'annonce'::"text") OR "public"."is_commune_admin"())));

CREATE POLICY "Authenticated users can view EPCI" ON "public"."epci" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Authenticated users can view communes" ON "public"."communes" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Authors and admins can delete posts" ON "public"."posts" FOR DELETE TO "authenticated" USING ((("author_id" = "auth"."uid"()) OR (("commune_id" = "public"."auth_commune_id"()) AND "public"."is_commune_admin"())));

CREATE POLICY "Authors can delete own comments" ON "public"."comments" FOR DELETE TO "authenticated" USING (("author_id" = "auth"."uid"()));

CREATE POLICY "Authors can update own posts" ON "public"."posts" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"()));

CREATE POLICY "Post authors can add images" ON "public"."post_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_images"."post_id") AND ("posts"."author_id" = "auth"."uid"())))));

CREATE POLICY "Users can delete own RSVPs" ON "public"."rsvps" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));

CREATE POLICY "Users can update own RSVPs" ON "public"."rsvps" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));

CREATE POLICY "Users can view EPCI-visible posts" ON "public"."posts" FOR SELECT TO "authenticated" USING ((("epci_visible" = true) AND ("commune_id" IN ( SELECT "c"."id"
   FROM "public"."communes" "c"
  WHERE ("c"."epci_id" = ( SELECT "c2"."epci_id"
           FROM "public"."communes" "c2"
          WHERE ("c2"."id" = "public"."auth_commune_id"())))))));

CREATE POLICY "Users can view RSVPs in own commune" ON "public"."rsvps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "rsvps"."post_id") AND ("posts"."commune_id" = "public"."auth_commune_id"())))));

CREATE POLICY "Users can view comments in own commune" ON "public"."comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "comments"."post_id") AND ("posts"."commune_id" = "public"."auth_commune_id"())))));

CREATE POLICY "Users can view post images in own commune" ON "public"."post_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_images"."post_id") AND ("posts"."commune_id" = "public"."auth_commune_id"())))));

CREATE POLICY "Users can view posts in own commune" ON "public"."posts" FOR SELECT TO "authenticated" USING (("commune_id" = "public"."auth_commune_id"()));

CREATE POLICY "Users can view profiles in own commune" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("commune_id" = "public"."auth_commune_id"()));

CREATE POLICY "audit_insert" ON "public"."audit_log" FOR INSERT WITH CHECK (("public"."is_commune_moderator"() OR ("actor_id" IS NULL)));

ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON "public"."audit_log" FOR SELECT USING ((("commune_id" = "public"."auth_commune_id"()) AND ("public"."is_commune_admin"() OR ("actor_id" = "auth"."uid"()))));

ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."communes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."epci" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."poll_options" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_options_insert" ON "public"."poll_options" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."polls" "pl"
     JOIN "public"."posts" "p" ON (("p"."id" = "pl"."post_id")))
  WHERE (("pl"."id" = "poll_options"."poll_id") AND ("p"."author_id" = "auth"."uid"())))));

CREATE POLICY "poll_options_select" ON "public"."poll_options" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."polls" "pl"
     JOIN "public"."posts" "p" ON (("p"."id" = "pl"."post_id")))
     JOIN "public"."profiles" "pr" ON (("pr"."commune_id" = "p"."commune_id")))
  WHERE (("pl"."id" = "poll_options"."poll_id") AND ("pr"."id" = "auth"."uid"())))));

ALTER TABLE "public"."poll_votes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_votes_delete" ON "public"."poll_votes" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "poll_votes_insert" ON "public"."poll_votes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "poll_votes_select" ON "public"."poll_votes" FOR SELECT USING (true);

ALTER TABLE "public"."polls" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls_delete" ON "public"."polls" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "polls"."post_id") AND ("p"."author_id" = "auth"."uid"())))) OR "public"."is_commune_admin"()));

CREATE POLICY "polls_insert" ON "public"."polls" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "polls"."post_id") AND ("p"."author_id" = "auth"."uid"())))));

CREATE POLICY "polls_select" ON "public"."polls" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."posts" "p"
     JOIN "public"."profiles" "pr" ON (("pr"."commune_id" = "p"."commune_id")))
  WHERE (("p"."id" = "polls"."post_id") AND ("pr"."id" = "auth"."uid"())))));

ALTER TABLE "public"."post_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."producers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "producers_delete" ON "public"."producers" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR "public"."is_commune_admin"()));

CREATE POLICY "producers_insert" ON "public"."producers" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));

CREATE POLICY "producers_select" ON "public"."producers" FOR SELECT USING (((("status" = 'active'::"text") AND ("commune_id" IN ( SELECT "c"."id"
   FROM "public"."communes" "c"
  WHERE ("c"."epci_id" = ( SELECT "c2"."epci_id"
           FROM ("public"."communes" "c2"
             JOIN "public"."profiles" "p" ON (("p"."commune_id" = "c2"."id")))
          WHERE ("p"."id" = "auth"."uid"())))))) OR ("created_by" = "auth"."uid"()) OR "public"."is_commune_admin"()));

CREATE POLICY "producers_update" ON "public"."producers" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR "public"."is_commune_admin"()));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert" ON "public"."reports" FOR INSERT WITH CHECK ((("auth"."uid"() = "reporter_id") AND "public"."is_approved"()));

CREATE POLICY "reports_select" ON "public"."reports" FOR SELECT USING ((("reporter_id" = "auth"."uid"()) OR "public"."is_commune_moderator"()));

CREATE POLICY "reports_update" ON "public"."reports" FOR UPDATE USING ("public"."is_commune_moderator"());

ALTER TABLE "public"."rsvps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."word_filters" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "word_filters_select" ON "public"."word_filters" FOR SELECT USING (true);

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."auth_commune_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_commune_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_commune_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."check_report_threshold"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_report_threshold"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_report_threshold"() TO "service_role";

GRANT ALL ON FUNCTION "public"."is_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_approved"() TO "service_role";

GRANT ALL ON FUNCTION "public"."is_commune_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_commune_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_commune_admin"() TO "service_role";

GRANT ALL ON FUNCTION "public"."is_commune_moderator"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_commune_moderator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_commune_moderator"() TO "service_role";

GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";
GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";

GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";

GRANT ALL ON TABLE "public"."communes" TO "anon";
GRANT ALL ON TABLE "public"."communes" TO "authenticated";
GRANT ALL ON TABLE "public"."communes" TO "service_role";

GRANT ALL ON TABLE "public"."epci" TO "anon";
GRANT ALL ON TABLE "public"."epci" TO "authenticated";
GRANT ALL ON TABLE "public"."epci" TO "service_role";

GRANT ALL ON TABLE "public"."poll_options" TO "anon";
GRANT ALL ON TABLE "public"."poll_options" TO "authenticated";
GRANT ALL ON TABLE "public"."poll_options" TO "service_role";

GRANT ALL ON TABLE "public"."poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."poll_votes" TO "service_role";

GRANT ALL ON TABLE "public"."polls" TO "anon";
GRANT ALL ON TABLE "public"."polls" TO "authenticated";
GRANT ALL ON TABLE "public"."polls" TO "service_role";

GRANT ALL ON TABLE "public"."post_images" TO "anon";
GRANT ALL ON TABLE "public"."post_images" TO "authenticated";
GRANT ALL ON TABLE "public"."post_images" TO "service_role";

GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";

GRANT ALL ON TABLE "public"."producers" TO "anon";
GRANT ALL ON TABLE "public"."producers" TO "authenticated";
GRANT ALL ON TABLE "public"."producers" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";

GRANT ALL ON TABLE "public"."rsvps" TO "anon";
GRANT ALL ON TABLE "public"."rsvps" TO "authenticated";
GRANT ALL ON TABLE "public"."rsvps" TO "service_role";

GRANT ALL ON TABLE "public"."word_filters" TO "anon";
GRANT ALL ON TABLE "public"."word_filters" TO "authenticated";
GRANT ALL ON TABLE "public"."word_filters" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- ============================================================
-- Push tokens (multi-device support)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_tokens_token_key" UNIQUE ("token"),
    CONSTRAINT "push_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);

ALTER TABLE "public"."push_tokens" OWNER TO "postgres";

CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");

ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tokens" ON "public"."push_tokens" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view own tokens" ON "public"."push_tokens" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete own tokens" ON "public"."push_tokens" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Service role can read all tokens" ON "public"."push_tokens" FOR SELECT TO "service_role" USING (true);

GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";

-- ============================================================
-- Storage buckets and policies
-- ============================================================

INSERT INTO "storage"."buckets" ("id", "name", "public") VALUES ('post-images', 'post-images', true);
INSERT INTO "storage"."buckets" ("id", "name", "public") VALUES ('avatars', 'avatars', true);

CREATE POLICY "Authenticated users can upload post images" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'post-images'));
CREATE POLICY "Anyone can view post images" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'post-images'));

CREATE POLICY "Authenticated users can upload avatars" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'avatars'));
CREATE POLICY "Anyone can view avatars" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'));
CREATE POLICY "Users can update own avatars" ON "storage"."objects" FOR UPDATE TO "authenticated" USING (("bucket_id" = 'avatars'));
CREATE POLICY "Users can delete own avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING (("bucket_id" = 'avatars'));

-- Restore search_path so seed.sql can use unqualified table names
SET search_path = public, extensions;
