# Community Board (v1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the MVP community board — a multi-tenant platform where small French communes can post announcements, events, and community messages, with mairie admin moderation.

**Architecture:** Next.js App Router with Supabase for auth, database, storage, and realtime. Multi-tenant via commune_id on all tables. PWA-enabled for push notifications. Row Level Security (RLS) on all Supabase tables to enforce tenant isolation and role-based access.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Supabase (Postgres + Auth + Realtime + Storage), Tailwind CSS, shadcn/ui, Vercel

---

### Task 1: Project Scaffolding

**Files:**
- Create: project root via `create-next-app`
- Create: `.env.local` (gitignored)
- Modify: `package.json` (add dependencies)

**Step 1: Create Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected: Next.js project scaffolded in current directory.

**Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase
```

**Step 3: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

**Step 4: Add shadcn components we'll need**

Run:
```bash
npx shadcn@latest add button card dialog form input label select separator tabs textarea toast badge avatar dropdown-menu
```

**Step 5: Create `.env.local`**

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Add to `.gitignore` if not already present:
```
.env.local
```

**Step 6: Initialize Supabase locally**

Run:
```bash
npx supabase init
```

**Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with Supabase and shadcn/ui"
```

---

### Task 2: Supabase Auth Setup (Server-Side)

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Modify: `src/middleware.ts`

**Step 1: Create browser Supabase client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server Supabase client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Step 3: Create middleware helper**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except public routes)
  const publicRoutes = ["/login", "/signup", "/auth/callback", "/invite"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

**Step 4: Create Next.js middleware**

Create `src/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 5: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat(auth): add Supabase client setup and auth middleware"
```

---

### Task 3: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write the migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Communes (tenants)
CREATE TABLE communes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code_postal TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commune_id UUID NOT NULL REFERENCES communes(id),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts (community board)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id UUID NOT NULL REFERENCES communes(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('annonce', 'evenement', 'entraide', 'discussion')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  -- Event-specific fields (null for non-events)
  event_date TIMESTAMPTZ,
  event_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Post images
CREATE TABLE post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RSVPs (for events)
CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX idx_posts_commune_id ON posts(commune_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_profiles_commune_id ON profiles(commune_id);

-- Row Level Security
ALTER TABLE communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only see data from their own commune
CREATE POLICY "Users can view own commune"
  ON communes FOR SELECT
  USING (id = (SELECT commune_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view profiles in own commune"
  ON profiles FOR SELECT
  USING (commune_id = (SELECT commune_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view posts in own commune"
  ON posts FOR SELECT
  USING (commune_id = (SELECT commune_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Approved users can create posts in own commune"
  ON posts FOR INSERT
  WITH CHECK (
    commune_id = (SELECT commune_id FROM profiles WHERE id = auth.uid() AND is_approved = true)
    AND author_id = auth.uid()
  );

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors and admins can delete posts"
  ON posts FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND commune_id = posts.commune_id
    )
  );

CREATE POLICY "Users can view post images in own commune"
  ON post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.commune_id = (SELECT commune_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Post authors can add images"
  ON post_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can view comments in own commune"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = comments.post_id
      AND posts.commune_id = (SELECT commune_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Approved users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts
      JOIN profiles ON profiles.id = auth.uid()
      WHERE posts.id = comments.post_id
      AND posts.commune_id = profiles.commune_id
      AND profiles.is_approved = true
    )
  );

CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE
  USING (author_id = auth.uid());

CREATE POLICY "Users can view RSVPs in own commune"
  ON rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = rsvps.post_id
      AND posts.commune_id = (SELECT commune_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own RSVPs"
  ON rsvps FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own RSVPs"
  ON rsvps FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own RSVPs"
  ON rsvps FOR DELETE
  USING (user_id = auth.uid());

-- Admin policies
CREATE POLICY "Admins can pin/unpin posts in own commune"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND commune_id = posts.commune_id
    )
  );

CREATE POLICY "Admins can delete comments in own commune"
  ON comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN posts ON posts.id = comments.post_id
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.commune_id = posts.commune_id
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');
```

**Step 2: Apply migration locally**

Run:
```bash
npx supabase start
npx supabase db reset
```

Expected: Migration applied, all tables created.

**Step 3: Generate TypeScript types**

Run:
```bash
npx supabase gen types typescript --local > src/lib/supabase/types.ts
```

**Step 4: Commit**

```bash
git add supabase/migrations/ src/lib/supabase/types.ts
git commit -m "feat(db): add initial schema with communes, posts, comments, RSVPs, and RLS"
```

---

### Task 4: Auth Pages (Signup + Login)

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/invite/[code]/page.tsx`

**Step 1: Create auth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

**Step 2: Create login page**

Create `src/app/login/page.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="underline">
              S&apos;inscrire
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create signup page with invite code**

Create `src/app/signup/page.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Verify invite code and get commune
    const { data: commune, error: communeError } = await supabase
      .from("communes")
      .select("id, name")
      .eq("invite_code", inviteCode)
      .single();

    if (communeError || !commune) {
      setError("Code d'invitation invalide");
      setLoading(false);
      return;
    }

    // Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          commune_id: commune.id,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        commune_id: commune.id,
        full_name: fullName,
        role: "resident",
        is_approved: false,
      });

      if (profileError) {
        setError("Erreur lors de la création du profil");
        setLoading(false);
        return;
      }
    }

    router.push("/pending-approval");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Inscription</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Code d&apos;invitation</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Code fourni par votre mairie"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Create invite link page**

Create `src/app/invite/[code]/page.tsx`:
```typescript
import { redirect } from "next/navigation";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/signup?code=${code}`);
}
```

**Step 5: Create pending approval page**

Create `src/app/pending-approval/page.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            En attente de validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Votre inscription a bien été enregistrée. La mairie doit valider
            votre compte avant que vous puissiez accéder à la plateforme.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add src/app/login/ src/app/signup/ src/app/auth/ src/app/invite/ src/app/pending-approval/
git commit -m "feat(auth): add login, signup with invite code, and pending approval pages"
```

---

### Task 5: Layout and Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/nav-bar.tsx`
- Create: `src/lib/hooks/use-profile.ts`
- Modify: `src/app/page.tsx`

**Step 1: Create profile hook**

Create `src/lib/hooks/use-profile.ts`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

type Profile = {
  id: string;
  commune_id: string;
  full_name: string;
  avatar_url: string | null;
  role: "resident" | "admin";
  is_approved: boolean;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    fetchProfile();
  }, []);

  return { profile, loading };
}
```

**Step 2: Create navigation bar**

Create `src/components/nav-bar.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/use-profile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function NavBar() {
  const { profile } = useProfile();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!profile) return null;

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-bold text-lg">
          Mon Village
        </Link>

        <nav className="flex items-center gap-4">
          {profile.role === "admin" && (
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium">
                {profile.full_name}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
```

**Step 3: Update root layout**

Modify `src/app/layout.tsx` to include the NavBar for authenticated routes. The layout should conditionally render NavBar (not on login/signup pages). Use a simple approach: NavBar handles its own visibility via the profile hook.

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mon Village",
  description: "La plateforme de votre commune",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

**Step 4: Update home page as feed entry point**

Replace `src/app/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) redirect("/pending-approval");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Fil communal</h1>
      {/* Feed component will go here in Task 6 */}
      <p className="text-muted-foreground">Aucune publication pour le moment.</p>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/components/nav-bar.tsx src/lib/hooks/
git commit -m "feat(layout): add navigation bar, profile hook, and home page shell"
```

---

### Task 6: Post Feed (Read)

**Files:**
- Create: `src/components/post-card.tsx`
- Create: `src/components/post-feed.tsx`
- Create: `src/lib/types.ts`
- Modify: `src/app/page.tsx`

**Step 1: Create shared types**

Create `src/lib/types.ts`:
```typescript
export type PostType = "annonce" | "evenement" | "entraide" | "discussion";

export type Post = {
  id: string;
  commune_id: string;
  author_id: string;
  type: PostType;
  title: string;
  body: string;
  is_pinned: boolean;
  event_date: string | null;
  event_location: string | null;
  created_at: string;
  updated_at: string;
  author: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  comment_count: number;
  rsvp_counts: { going: number; maybe: number } | null;
  images: { id: string; storage_path: string }[];
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  annonce: "Annonce",
  evenement: "Événement",
  entraide: "Entraide",
  discussion: "Discussion",
};

export const POST_TYPE_COLORS: Record<PostType, string> = {
  annonce: "bg-red-100 text-red-800",
  evenement: "bg-blue-100 text-blue-800",
  entraide: "bg-green-100 text-green-800",
  discussion: "bg-gray-100 text-gray-800",
};
```

**Step 2: Create post card component**

Create `src/components/post-card.tsx`:
```typescript
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type Post, POST_TYPE_LABELS, POST_TYPE_COLORS } from "@/lib/types";
import Link from "next/link";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function PostCard({ post }: { post: Post }) {
  const initials = post.author.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className={`hover:shadow-md transition-shadow ${post.is_pinned ? "border-primary" : ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-medium">
                  {post.author.full_name}
                </span>
                {post.author.role === "admin" && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Mairie
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  {timeAgo(post.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.is_pinned && (
                <Badge variant="outline" className="text-xs">
                  Épinglé
                </Badge>
              )}
              <Badge className={POST_TYPE_COLORS[post.type]}>
                {POST_TYPE_LABELS[post.type]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-1">{post.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.body}
          </p>
          {post.type === "evenement" && post.event_date && (
            <div className="mt-2 text-sm">
              <span className="font-medium">
                {new Date(post.event_date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {post.event_location && (
                <span className="text-muted-foreground">
                  {" "}
                  — {post.event_location}
                </span>
              )}
              {post.rsvp_counts && (
                <span className="ml-2 text-muted-foreground">
                  ({post.rsvp_counts.going} participant
                  {post.rsvp_counts.going !== 1 ? "s" : ""})
                </span>
              )}
            </div>
          )}
          {post.comment_count > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {post.comment_count} commentaire
              {post.comment_count !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Step 3: Create feed component with filtering**

Create `src/components/post-feed.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { type Post, type PostType, POST_TYPE_LABELS } from "@/lib/types";
import { useEffect, useState } from "react";

export function PostFeed({ communeId }: { communeId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<PostType | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!author_id(full_name, avatar_url, role),
          images:post_images(id, storage_path),
          comments(count),
          rsvps(status)
        `
        )
        .eq("commune_id", communeId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data } = await query;

      if (data) {
        const mapped: Post[] = data.map((p: any) => ({
          ...p,
          author: p.author,
          images: p.images ?? [],
          comment_count: p.comments?.[0]?.count ?? 0,
          rsvp_counts:
            p.type === "evenement"
              ? {
                  going: p.rsvps?.filter(
                    (r: any) => r.status === "going"
                  ).length ?? 0,
                  maybe: p.rsvps?.filter(
                    (r: any) => r.status === "maybe"
                  ).length ?? 0,
                }
              : null,
        }));
        setPosts(mapped);
      }
      setLoading(false);
    }

    fetchPosts();
  }, [communeId, filter]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `commune_id=eq.${communeId}`,
        },
        () => {
          // Refetch on new post — simple approach
          setFilter((f) => f); // trigger re-render
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communeId]);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Tout
        </Button>
        {(
          Object.entries(POST_TYPE_LABELS) as [PostType, string][]
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">Aucune publication.</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Wire feed into home page**

Update `src/app/page.tsx` to pass `communeId` to `PostFeed`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PostFeed } from "@/components/post-feed";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) redirect("/pending-approval");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Fil communal</h1>
      <PostFeed communeId={profile.commune_id} />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/post-card.tsx src/components/post-feed.tsx src/lib/types.ts src/app/page.tsx
git commit -m "feat(feed): add post feed with filtering, realtime updates, and post cards"
```

---

### Task 7: Create Post Form

**Files:**
- Create: `src/components/create-post-dialog.tsx`
- Create: `src/lib/actions/posts.ts`
- Modify: `src/app/page.tsx` (add create button)

**Step 1: Create server action for post creation**

Create `src/lib/actions/posts.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("commune_id, is_approved")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) return { error: "Compte non validé" };

  const type = formData.get("type") as string;
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const eventDate = formData.get("event_date") as string | null;
  const eventLocation = formData.get("event_location") as string | null;

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      commune_id: profile.commune_id,
      author_id: user.id,
      type,
      title,
      body,
      event_date: eventDate || null,
      event_location: eventLocation || null,
    })
    .select()
    .single();

  if (error) return { error: "Erreur lors de la création" };

  // Handle image uploads
  const images = formData.getAll("images") as File[];
  for (const image of images) {
    if (image.size === 0) continue;

    const ext = image.name.split(".").pop();
    const path = `${profile.commune_id}/${post.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, image);

    if (!uploadError) {
      await supabase.from("post_images").insert({
        post_id: post.id,
        storage_path: path,
      });
    }
  }

  revalidatePath("/");
  return { success: true };
}
```

**Step 2: Create post dialog component**

Create `src/components/create-post-dialog.tsx`:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPost } from "@/lib/actions/posts";
import { POST_TYPE_LABELS, type PostType } from "@/lib/types";
import { useState } from "react";

export function CreatePostDialog({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PostType>("discussion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);

    const result = await createPost(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    setLoading(false);
  }

  const availableTypes = isAdmin
    ? Object.keys(POST_TYPE_LABELS)
    : Object.keys(POST_TYPE_LABELS).filter((t) => t !== "annonce");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouvelle publication</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle publication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as PostType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {POST_TYPE_LABELS[t as PostType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" rows={4} required />
          </div>

          {type === "evenement" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="event_date">Date et heure</Label>
                <Input
                  id="event_date"
                  name="event_date"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event_location">Lieu</Label>
                <Input id="event_location" name="event_location" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="images">Photos (optionnel)</Label>
            <Input
              id="images"
              name="images"
              type="file"
              accept="image/*"
              multiple
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Publication..." : "Publier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: Add create button to home page**

Update `src/app/page.tsx` — add `CreatePostDialog` next to the title:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PostFeed } from "@/components/post-feed";
import { CreatePostDialog } from "@/components/create-post-dialog";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) redirect("/pending-approval");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fil communal</h1>
        <CreatePostDialog isAdmin={profile.role === "admin"} />
      </div>
      <PostFeed communeId={profile.commune_id} />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/lib/actions/posts.ts src/components/create-post-dialog.tsx src/app/page.tsx
git commit -m "feat(posts): add create post dialog with image upload and server action"
```

---

### Task 8: Post Detail Page (Comments + RSVP)

**Files:**
- Create: `src/app/posts/[id]/page.tsx`
- Create: `src/components/comment-section.tsx`
- Create: `src/components/rsvp-buttons.tsx`
- Create: `src/lib/actions/comments.ts`
- Create: `src/lib/actions/rsvps.ts`

**Step 1: Create comment server action**

Create `src/lib/actions/comments.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addComment(postId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    body,
  });

  if (error) return { error: "Erreur lors de l'ajout du commentaire" };

  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) return { error: "Erreur lors de la suppression" };

  revalidatePath(`/posts/${postId}`);
  return { success: true };
}
```

**Step 2: Create RSVP server action**

Create `src/lib/actions/rsvps.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setRsvp(
  postId: string,
  status: "going" | "maybe" | "not_going"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("rsvps").upsert(
    {
      post_id: postId,
      user_id: user.id,
      status,
    },
    { onConflict: "post_id,user_id" }
  );

  if (error) return { error: "Erreur" };

  revalidatePath(`/posts/${postId}`);
  return { success: true };
}
```

**Step 3: Create RSVP buttons component**

Create `src/components/rsvp-buttons.tsx`:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { setRsvp } from "@/lib/actions/rsvps";
import { useState } from "react";

type RsvpStatus = "going" | "maybe" | "not_going";

export function RsvpButtons({
  postId,
  currentStatus,
  counts,
}: {
  postId: string;
  currentStatus: RsvpStatus | null;
  counts: { going: number; maybe: number; not_going: number };
}) {
  const [status, setStatus] = useState(currentStatus);

  async function handleRsvp(newStatus: RsvpStatus) {
    setStatus(newStatus);
    await setRsvp(postId, newStatus);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant={status === "going" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("going")}
      >
        J&apos;y vais ({counts.going})
      </Button>
      <Button
        variant={status === "maybe" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("maybe")}
      >
        Peut-être ({counts.maybe})
      </Button>
      <Button
        variant={status === "not_going" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("not_going")}
      >
        Pas dispo ({counts.not_going})
      </Button>
    </div>
  );
}
```

**Step 4: Create comment section component**

Create `src/components/comment-section.tsx`:
```typescript
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "@/lib/actions/comments";
import { useState } from "react";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string; avatar_url: string | null };
  author_id: string;
};

export function CommentSection({
  postId,
  comments,
  currentUserId,
  isAdmin,
}: {
  postId: string;
  comments: Comment[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await addComment(postId, body);
    setBody("");
    setLoading(false);
  }

  async function handleDelete(commentId: string) {
    await deleteComment(commentId, postId);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">
        Commentaires ({comments.length})
      </h3>

      {comments.map((comment) => {
        const initials = comment.author.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.author.full_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString("fr-FR")}
                </span>
                {(comment.author_id === currentUserId || isAdmin) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <p className="text-sm mt-1">{comment.body}</p>
            </div>
          </div>
        );
      })}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écrire un commentaire..."
          rows={2}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !body.trim()}>
          Envoyer
        </Button>
      </form>
    </div>
  );
}
```

**Step 5: Create post detail page**

Create `src/app/posts/[id]/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommentSection } from "@/components/comment-section";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { POST_TYPE_LABELS, POST_TYPE_COLORS, type PostType } from "@/lib/types";
import Link from "next/link";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) redirect("/pending-approval");

  // Fetch post with author, images, comments
  const { data: post } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!author_id(full_name, avatar_url, role),
      images:post_images(id, storage_path),
      comments(id, body, created_at, author_id, author:profiles!author_id(full_name, avatar_url)),
      rsvps(user_id, status)
    `
    )
    .eq("id", id)
    .single();

  if (!post || post.commune_id !== profile.commune_id) notFound();

  const initials = post.author.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentRsvp = post.rsvps?.find(
    (r: any) => r.user_id === user.id
  );

  const rsvpCounts = {
    going: post.rsvps?.filter((r: any) => r.status === "going").length ?? 0,
    maybe: post.rsvps?.filter((r: any) => r.status === "maybe").length ?? 0,
    not_going:
      post.rsvps?.filter((r: any) => r.status === "not_going").length ?? 0,
  };

  const imageUrls = post.images?.map((img: any) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("post-images").getPublicUrl(img.storage_path);
    return publicUrl;
  }) ?? [];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:underline mb-4 block"
      >
        &larr; Retour au fil
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium">{post.author.full_name}</span>
                {post.author.role === "admin" && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Mairie
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <Badge className={POST_TYPE_COLORS[post.type as PostType]}>
              {POST_TYPE_LABELS[post.type as PostType]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <h1 className="text-xl font-bold">{post.title}</h1>
          <p className="whitespace-pre-wrap">{post.body}</p>

          {post.type === "evenement" && post.event_date && (
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">
                {new Date(post.event_date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {post.event_location && (
                <p className="text-sm text-muted-foreground">
                  {post.event_location}
                </p>
              )}
            </div>
          )}

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imageUrls.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="rounded-lg object-cover w-full h-48"
                />
              ))}
            </div>
          )}

          {post.type === "evenement" && (
            <>
              <Separator />
              <RsvpButtons
                postId={post.id}
                currentStatus={currentRsvp?.status ?? null}
                counts={rsvpCounts}
              />
            </>
          )}

          <Separator />

          <CommentSection
            postId={post.id}
            comments={post.comments ?? []}
            currentUserId={user.id}
            isAdmin={profile.role === "admin"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add src/app/posts/ src/components/comment-section.tsx src/components/rsvp-buttons.tsx src/lib/actions/
git commit -m "feat(posts): add post detail page with comments and RSVP"
```

---

### Task 9: Admin Panel

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/pending-users.tsx`
- Create: `src/components/admin/manage-posts.tsx`
- Create: `src/lib/actions/admin.ts`

**Step 1: Create admin server actions**

Create `src/lib/actions/admin.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, commune_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Non autorisé");

  return { supabase, communeId: profile.commune_id };
}

export async function approveUser(userId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ is_approved: true })
    .eq("id", userId);

  if (error) return { error: "Erreur" };

  revalidatePath("/admin");
  return { success: true };
}

export async function rejectUser(userId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) return { error: "Erreur" };

  revalidatePath("/admin");
  return { success: true };
}

export async function togglePinPost(postId: string, isPinned: boolean) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("posts")
    .update({ is_pinned: !isPinned })
    .eq("id", postId);

  if (error) return { error: "Erreur" };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export async function deletePost(postId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) return { error: "Erreur" };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}
```

**Step 2: Create pending users component**

Create `src/components/admin/pending-users.tsx`:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveUser, rejectUser } from "@/lib/actions/admin";

type PendingUser = {
  id: string;
  full_name: string;
  created_at: string;
};

export function PendingUsers({ users }: { users: PendingUser[] }) {
  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inscriptions en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune inscription en attente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inscriptions en attente ({users.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between border-b pb-3 last:border-0"
          >
            <div>
              <p className="font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => approveUser(user.id)}>
                Valider
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => rejectUser(user.id)}
              >
                Refuser
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create manage posts component**

Create `src/components/admin/manage-posts.tsx`:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { togglePinPost, deletePost } from "@/lib/actions/admin";
import { POST_TYPE_LABELS, type PostType } from "@/lib/types";

type AdminPost = {
  id: string;
  title: string;
  type: PostType;
  is_pinned: boolean;
  created_at: string;
  author: { full_name: string };
};

export function ManagePosts({ posts }: { posts: AdminPost[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publications récentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between border-b pb-3 last:border-0"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{post.title}</p>
                <Badge variant="outline">
                  {POST_TYPE_LABELS[post.type]}
                </Badge>
                {post.is_pinned && <Badge>Épinglé</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Par {post.author.full_name} —{" "}
                {new Date(post.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePinPost(post.id, post.is_pinned)}
              >
                {post.is_pinned ? "Désépingler" : "Épingler"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deletePost(post.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create admin page**

Create `src/app/admin/page.tsx`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PendingUsers } from "@/components/admin/pending-users";
import { ManagePosts } from "@/components/admin/manage-posts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  // Fetch commune info
  const { data: commune } = await supabase
    .from("communes")
    .select("*")
    .eq("id", profile.commune_id)
    .single();

  // Fetch pending users
  const { data: pendingUsers } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("commune_id", profile.commune_id)
    .eq("is_approved", false)
    .order("created_at", { ascending: true });

  // Fetch recent posts
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, title, type, is_pinned, created_at, author:profiles!author_id(full_name)")
    .eq("commune_id", profile.commune_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Administration</h1>

      <div className="space-y-6">
        {/* Commune info with invite code */}
        <Card>
          <CardHeader>
            <CardTitle>{commune?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Code d&apos;invitation :{" "}
              <code className="bg-muted px-2 py-1 rounded font-mono">
                {commune?.invite_code}
              </code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Partagez ce code avec les habitants pour qu&apos;ils puissent
              s&apos;inscrire.
            </p>
          </CardContent>
        </Card>

        <PendingUsers users={pendingUsers ?? []} />
        <ManagePosts posts={(recentPosts as any) ?? []} />
      </div>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/app/admin/ src/components/admin/ src/lib/actions/admin.ts
git commit -m "feat(admin): add admin panel with user approval, post moderation, and invite code"
```

---

### Task 10: Account Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/lib/actions/profile.ts`

**Step 1: Create profile server actions**

Create `src/lib/actions/profile.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const fullName = formData.get("full_name") as string;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) return { error: "Erreur" };

  revalidatePath("/settings");
  return { success: true };
}

export async function updateEmail(newEmail: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) return { error: error.message };

  return { success: true, message: "Un email de confirmation a été envoyé." };
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) return { error: error.message };

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  // Soft delete: mark profile, actual deletion via scheduled job later
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: "Ancien résident", is_approved: false })
    .eq("id", user.id);

  if (error) return { error: "Erreur" };

  await supabase.auth.signOut();
  return { success: true };
}
```

**Step 2: Create settings page**

Create `src/app/settings/page.tsx`:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  deleteAccount,
} from "@/lib/actions/profile";
import { useProfile } from "@/lib/hooks/use-profile";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const { profile, loading } = useProfile();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!profile) return null;

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);
    setMessage(result.error ?? "Profil mis à jour.");
  }

  async function handleEmailUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updateEmail(formData.get("email") as string);
    setMessage(result.error ?? result.message ?? "Email mis à jour.");
  }

  async function handlePasswordUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updatePassword(formData.get("password") as string);
    setMessage(result.error ?? "Mot de passe mis à jour.");
  }

  async function handleDeleteAccount() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ?")) return;
    await deleteAccount();
    router.push("/login");
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {message && (
        <p className="mb-4 text-sm bg-muted p-3 rounded">{message}</p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile.full_name}
                  required
                />
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Nouvel email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <Button type="submit">Changer l&apos;email</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit">Changer le mot de passe</Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Zone de danger</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              La suppression de votre compte est irréversible.
            </p>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Supprimer mon compte
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/settings/ src/lib/actions/profile.ts
git commit -m "feat(settings): add account settings with profile, email, password, and deletion"
```

---

### Task 11: PWA + Push Notifications Setup

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `src/lib/notifications.ts`
- Modify: `src/app/layout.tsx` (add manifest link)

**Step 1: Create PWA manifest**

Create `public/manifest.json`:
```json
{
  "name": "Mon Village",
  "short_name": "MonVillage",
  "description": "La plateforme de votre commune",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Create service worker for push notifications**

Create `public/sw.js`:
```javascript
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "Mon Village";
  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
```

**Step 3: Create notification helper**

Create `src/lib/notifications.ts`:
```typescript
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // Register service worker
  const registration = await navigator.serviceWorker.register("/sw.js");

  // Subscribe to push
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

  // Send subscription to server (Supabase Edge Function)
  await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });

  return true;
}
```

**Step 4: Add manifest to layout**

Add `<link rel="manifest" href="/manifest.json" />` inside the `<head>` of `src/app/layout.tsx`.

**Step 5: Create placeholder icons**

Note: Generate real icons later. For now, create placeholder 192x192 and 512x512 PNG files.

**Step 6: Commit**

```bash
git add public/manifest.json public/sw.js src/lib/notifications.ts src/app/layout.tsx
git commit -m "feat(pwa): add PWA manifest, service worker, and push notification setup"
```

---

### Task 12: Seed Data + Local Testing

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Create seed data**

Create `supabase/seed.sql`:
```sql
-- Create a test commune
INSERT INTO communes (id, name, code_postal, invite_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'Village Test', '31000', 'TEST123');

-- Note: Create test users via Supabase Auth dashboard or signup flow.
-- After creating a user, manually insert a profile:
-- INSERT INTO profiles (id, commune_id, full_name, role, is_approved)
-- VALUES ('<auth-user-id>', '00000000-0000-0000-0000-000000000001', 'Admin Test', 'admin', true);
```

**Step 2: Apply seed**

Run:
```bash
npx supabase db reset
```

**Step 3: Start dev server and test manually**

Run:
```bash
npm run dev
```

Manual test checklist:
- [ ] Visit `/login` — see login form
- [ ] Visit `/signup?code=TEST123` — sign up with invite code
- [ ] Check admin panel — approve user
- [ ] Create posts of each type
- [ ] Add comments
- [ ] RSVP to an event
- [ ] Test filter buttons
- [ ] Test settings page

**Step 4: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore: add seed data for local development"
```

---

### Task 13: Deploy to Vercel

**Step 1: Create Supabase project on supabase.com**

- Create project, note URL and anon key.
- Run migration on remote: `npx supabase db push`

**Step 2: Deploy to Vercel**

Run:
```bash
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Step 3: Verify deployment**

- Visit production URL
- Test signup + login flow
- Create a test commune via Supabase dashboard

**Step 4: Commit any deployment config**

```bash
git add .
git commit -m "chore: configure Vercel deployment"
```
