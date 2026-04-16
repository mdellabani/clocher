# Supabase Auth Settings — long-lived sessions

Goal: users stay signed in indefinitely as long as they open the app at least once before the refresh-token TTL expires (default 60 days). Manual logout is the only way to end a session.

For each Supabase project (demo + prod):

1. Authentication → Sessions
   - **Inactivity timeout**: leave blank (= disabled)
   - **Time-box user sessions**: leave blank
2. Authentication → Tokens
   - **Refresh token rotation**: enabled
   - **Refresh token reuse interval**: 10 seconds
   - **JWT expiry**: 3600 seconds (1 hour)

The web middleware (`apps/web/src/lib/supabase/middleware.ts`) makes one explicit `refreshSession()` attempt when an expired access-token cookie is detected, so users never see a sudden bounce to `/auth/login` mid-session.
