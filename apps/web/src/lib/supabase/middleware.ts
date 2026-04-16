import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/app");

  // Public routes: don't touch Supabase auth at all. Saves a round-trip on
  // every landing-page hit and avoids spurious refresh attempts when an
  // anonymous visitor's browser carries a stale auth cookie.
  if (!isProtected) {
    return supabaseResponse;
  }

  // getUser also triggers a token refresh under the hood when needed.
  // The cookie writes from refresh are captured by setAll above.
  let { data: { user } } = await supabase.auth.getUser();

  // Belt-and-suspenders: if no user but a refresh token cookie exists,
  // make one explicit attempt to refresh before bouncing to login.
  if (!user) {
    const hasRefreshCookie = request.cookies.getAll().some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
    if (hasRefreshCookie) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        user = refreshed.user ?? null;
      } catch {
        // Stale or invalid refresh token: leave user as null, fall through
        // to the redirect below. The bad cookie will be replaced on next
        // successful login.
      }
    }
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
