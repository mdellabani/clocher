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

  // getUser also triggers a token refresh under the hood when needed.
  // The cookie writes from refresh are captured by setAll above.
  let { data: { user } } = await supabase.auth.getUser();

  // Belt-and-suspenders: if no user but a refresh token cookie exists,
  // make one explicit attempt to refresh before bouncing to login.
  if (!user) {
    const hasRefreshCookie = request.cookies.getAll().some(c => c.name.includes("auth-token"));
    if (hasRefreshCookie) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      user = refreshed.user ?? null;
    }
  }

  const { pathname } = request.nextUrl;
  if (!user && (pathname.startsWith("/admin") || pathname.startsWith("/app"))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
