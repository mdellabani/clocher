-- Move messaging trigger config (functions_url, service_role_key) out of
-- database GUCs and into a tiny config table. GUCs are settable only via
-- DB-level access (psql / Studio / Management API), all of which require
-- credentials beyond the service-role key. A table is reachable through
-- PostgREST with the same service-role key the rest of the app already
-- uses, so the deploy script can populate it without an access token.

CREATE TABLE IF NOT EXISTS public.runtime_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.runtime_config ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS, but we still need an explicit policy so the
-- table is readable by SECURITY INVOKER trigger functions running as
-- whichever role inserted the message. SECURITY DEFINER triggers run as
-- the table owner — but to be safe for both, allow read to authenticated.
CREATE POLICY "runtime_config readable by all authenticated"
  ON public.runtime_config FOR SELECT
  TO authenticated, anon
  USING (true);

-- No INSERT/UPDATE/DELETE policy: writes happen through PostgREST with
-- the service-role key, which bypasses RLS.

CREATE OR REPLACE FUNCTION public.invoke_notify_new_message()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  SELECT value INTO v_url FROM public.runtime_config WHERE key = 'functions_url';
  IF v_url IS NULL OR v_url = '' THEN
    RETURN NEW;
  END IF;
  SELECT value INTO v_key FROM public.runtime_config WHERE key = 'service_role_key';
  PERFORM net.http_post(
    url := v_url || '/notify_new_message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_key, '')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$;
