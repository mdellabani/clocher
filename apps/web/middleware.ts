import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "localhost:3000";

// Hostnames that should pass through without domain resolution
function isPlatformHost(hostname: string): boolean {
  // localhost / dev
  if (hostname === "localhost" || hostname.startsWith("localhost:")) return true;
  // Exact platform domain (e.g. app.example.fr)
  if (hostname === PLATFORM_DOMAIN) return true;
  // Vercel preview URLs
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

function extractSubdomain(hostname: string): string | null {
  // hostname = "saint-martin.app.example.fr"
  // PLATFORM_DOMAIN = "app.example.fr"
  if (!hostname.endsWith(`.${PLATFORM_DOMAIN}`)) return null;
  const sub = hostname.slice(0, -(PLATFORM_DOMAIN.length + 1));
  // Ignore "www" subdomain
  if (sub === "www") return null;
  // Only single-level subdomains
  if (sub.includes(".")) return null;
  return sub;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // 1. Platform host — pass through
  if (isPlatformHost(hostname)) {
    return NextResponse.next();
  }

  // 2. Subdomain — rewrite to /[commune-slug]/...
  const subdomain = extractSubdomain(hostname);
  if (subdomain) {
    const url = request.nextUrl.clone();
    url.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 3. Custom domain — look up in database
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Middleware can't set cookies directly, but we need the interface
        },
      },
    }
  );

  const { data: commune } = await supabase
    .from("communes")
    .select("slug")
    .eq("custom_domain", hostname)
    .eq("domain_verified", true)
    .single();

  if (commune) {
    const url = request.nextUrl.clone();
    url.pathname = `/${commune.slug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 4. No match
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
