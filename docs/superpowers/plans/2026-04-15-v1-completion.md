# v1 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete v1 — password reset, commune invite code, image upload with resize, and Expo push notifications.

**Architecture:** Four independent features built on top of the existing Next.js 15 + Expo + Supabase monorepo. Each feature touches web, mobile, and/or shared packages. Schema already has `invite_code` on communes, `avatar_url` on profiles, `post_images` table, and `post-images` storage bucket. We add a `push_tokens` table and `avatars` bucket via migration 005.

**Tech Stack:** Next.js 15 (App Router), Expo (React Native), Supabase (Auth, Storage, Edge Functions, Postgres), TypeScript, Zod, expo-notifications, expo-image-manipulator.

---

## File Structure

### Task 1: Password Reset
- Modify: `apps/web/src/app/auth/login/page.tsx` — add "Mot de passe oublié" link
- Create: `apps/web/src/app/auth/forgot-password/page.tsx` — email input form
- Create: `apps/web/src/app/auth/reset-password/page.tsx` — new password form
- Modify: `apps/mobile/src/app/auth/login.tsx` — add forgot password link (opens web URL)

### Task 2: Commune Invite Code
- Modify: `packages/shared/src/validation/profile.schema.ts` — add optional `invite_code` to signup schema
- Modify: `apps/web/src/app/auth/signup/page.tsx` — add invite code field + auto-approve logic
- Modify: `apps/mobile/src/app/auth/signup.tsx` — add invite code field + auto-approve logic
- Create: `apps/web/src/components/admin/invite-code-manager.tsx` — view/copy/regenerate code
- Create: `apps/web/src/app/admin/dashboard/invite-actions.ts` — server action to regenerate code
- Modify: `apps/web/src/app/admin/dashboard/page.tsx` — add InviteCodeManager section

### Task 3: Image Upload & Display
- Create: `supabase/migrations/005_push_tokens_and_avatars.sql` — push_tokens table + avatars bucket
- Modify: `apps/web/src/components/create-post-dialog.tsx` — add image file input + upload
- Modify: `apps/web/src/app/app/feed/actions.ts` — accept image file, upload to storage
- Modify: `apps/web/src/components/post-card.tsx` — display post image thumbnail
- Modify: `apps/mobile/src/components/post-card.tsx` — display post image thumbnail
- Modify: `apps/mobile/src/app/(tabs)/create.tsx` — add client-side resize before upload
- Modify: `apps/web/src/app/app/settings/settings-form.tsx` — add avatar upload
- Modify: `apps/mobile/src/app/profile.tsx` — add avatar upload with image picker

### Task 4: Push Notifications
- Modify: `apps/mobile/src/lib/notifications.ts` — fix token storage to use push_tokens table
- Modify: `supabase/functions/push-notification/index.ts` — read from push_tokens, handle evenement
- Modify: `apps/mobile/src/hooks/use-notifications.ts` — navigate to post on tap
- Modify: `apps/mobile/src/app/_layout.tsx` — integrate useNotifications hook

---

## Task 1: Password Reset

### Step 1.1: Create forgot password page (web)

- [ ] **Create `apps/web/src/app/auth/forgot-password/page.tsx`:**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Email envoyé</CardTitle>
            <CardDescription>
              Si un compte existe avec cette adresse, vous recevrez un lien pour
              réinitialiser votre mot de passe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/auth/login" className="text-sm underline text-foreground">
              Retour à la connexion
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <a href="/auth/login" className="underline text-foreground">
                Retour à la connexion
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 1.2: Create reset password page (web)

- [ ] **Create `apps/web/src/app/auth/reset-password/page.tsx`:**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase auth callback sets the session from the URL hash
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.");
      return;
    }

    router.push("/app/feed");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Réinitialisation</CardTitle>
            <CardDescription>Vérification en cours...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe pour votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Confirmez votre mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 1.3: Add forgot password link to web login

- [ ] **Modify `apps/web/src/app/auth/login/page.tsx`:** Add a "Mot de passe oublié ?" link between the password field and the submit button.

Add after the password `</div>` (after line 73) and before the `<Button>` (line 76):

```tsx
            <div className="text-right">
              <a
                href="/auth/forgot-password"
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Mot de passe oublié ?
              </a>
            </div>
```

### Step 1.4: Add forgot password link to mobile login

- [ ] **Modify `apps/mobile/src/app/auth/login.tsx`:** Add a "Mot de passe oublié ?" link that opens the web forgot password page in the system browser.

Add this import at the top:
```tsx
import { Linking } from "react-native";
```

Add after the submit button (after line 124, before the signup link) and before the `{/* Signup link */}` comment:

```tsx
          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotContainer}
            onPress={() => {
              const baseUrl = process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:3000";
              Linking.openURL(`${baseUrl}/auth/forgot-password`);
            }}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
```

Add these styles to the StyleSheet:
```tsx
  forgotContainer: { marginTop: 12, alignSelf: "center" },
  forgotText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#71717a",
    textDecorationLine: "underline",
  },
```

### Step 1.5: Verify and commit

- [ ] **Run web dev server and test the full flow:**
  - Navigate to `/auth/login` — verify "Mot de passe oublié ?" link appears
  - Click it — verify `/auth/forgot-password` page loads
  - Enter email, submit — verify success message appears
  - Check email (or Supabase dashboard for local dev: Inbucket at `localhost:54324`)
  - Click the reset link — verify `/auth/reset-password` page loads
  - Enter new password — verify redirect to `/app/feed`

- [ ] **Commit:**

```bash
git add apps/web/src/app/auth/forgot-password/page.tsx apps/web/src/app/auth/reset-password/page.tsx apps/web/src/app/auth/login/page.tsx apps/mobile/src/app/auth/login.tsx
git commit -m "feat(auth): add password reset flow (web + mobile link)"
```

---

## Task 2: Commune Invite Code

### Step 2.1: Update signup validation schema

- [ ] **Modify `packages/shared/src/validation/profile.schema.ts`:** Add optional `invite_code` field.

Replace the `signupSchema` definition with:

```typescript
export const signupSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  display_name: z.string().min(2, "Le nom est trop court").max(100, "Le nom est trop long"),
  commune_id: z.string().uuid("Commune invalide"),
  invite_code: z.string().optional(),
});
```

### Step 2.2: Update web signup with invite code

- [ ] **Modify `apps/web/src/app/auth/signup/page.tsx`:**

Add state for invite code after the existing state declarations (after line 37):

```tsx
  const [inviteCode, setInviteCode] = useState("");
```

In `handleSignup`, update the Zod parse call to include `invite_code`:

Replace the `result` parsing block (lines 58-67) with:

```tsx
    const result = signupSchema.safeParse({
      email,
      password,
      display_name: displayName,
      commune_id: communeId,
      invite_code: inviteCode || undefined,
    });
```

After the auth signup succeeds and before the profile insert, add invite code validation. Replace the profile insert block (lines 91-101) with:

```tsx
    // Check invite code to determine initial status
    let initialStatus = "pending";
    if (inviteCode) {
      const { data: commune } = await supabase
        .from("communes")
        .select("id, invite_code")
        .eq("id", communeId)
        .eq("invite_code", inviteCode)
        .single();

      if (commune) {
        initialStatus = "active";
      } else {
        setError("Code d'invitation invalide");
        setLoading(false);
        return;
      }
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      display_name: displayName,
      commune_id: communeId,
      status: initialStatus,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (initialStatus === "active") {
      router.push("/app/feed");
      router.refresh();
    } else {
      router.push("/auth/pending");
    }
```

Remove the existing `router.push("/auth/pending")` line (line 103) since it's now handled above.

Add the invite code input field to the form, right after the commune Select (after line 169):

```tsx
            <div className="space-y-1.5">
              <Label htmlFor="invite_code">Code d'invitation (optionnel)</Label>
              <Input
                id="invite_code"
                type="text"
                placeholder="Code fourni par la mairie"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Si vous avez un code, votre inscription sera validée automatiquement.
              </p>
            </div>
```

### Step 2.3: Update mobile signup with invite code

- [ ] **Modify `apps/mobile/src/app/auth/signup.tsx`:**

Add state (after line 35):

```tsx
  const [inviteCode, setInviteCode] = useState("");
```

Update the `signupSchema.safeParse` call (around line 59) to include:

```tsx
      invite_code: inviteCode || undefined,
```

Replace the profile insert block and success alert (lines 86-109) with:

```tsx
    if (authData.user) {
      // Check invite code to determine initial status
      let initialStatus: "pending" | "active" = "pending";
      if (inviteCode) {
        const { data: commune } = await supabase
          .from("communes")
          .select("id, invite_code")
          .eq("id", selectedCommuneId!)
          .eq("invite_code", inviteCode)
          .single();

        if (commune) {
          initialStatus = "active";
        } else {
          setLoading(false);
          Alert.alert("Erreur", "Code d'invitation invalide");
          return;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          display_name: parsed.data.display_name,
          commune_id: parsed.data.commune_id,
          role: "resident",
          status: initialStatus,
        });

      if (profileError) {
        setLoading(false);
        Alert.alert("Erreur", "Impossible de créer le profil");
        return;
      }
    }

    setLoading(false);
    if (inviteCode && selectedCommuneId) {
      router.replace("/(tabs)/feed");
    } else {
      Alert.alert(
        "Inscription réussie",
        "Votre compte a été créé. Un administrateur doit valider votre inscription.",
        [{ text: "OK", onPress: () => router.replace("/auth/login") }]
      );
    }
```

Add the invite code input field in the form, after the commune selection section (after the closing `</View>` of `communeSection`, around line 249):

```tsx
          {/* Invite code */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Lock size={16} color={theme.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Code d'invitation (optionnel)"
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              autoCapitalize="characters"
              placeholderTextColor="#a1a1aa"
            />
          </View>
          <Text style={styles.inviteHint}>
            Si vous avez un code, votre inscription sera validée automatiquement.
          </Text>
```

Add style:

```tsx
  inviteHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: -6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
```

### Step 2.4: Create admin invite code manager component

- [ ] **Create `apps/web/src/components/admin/invite-code-manager.tsx`:**

```tsx
"use client";

import { useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { regenerateInviteCodeAction } from "@/app/admin/dashboard/invite-actions";

interface InviteCodeManagerProps {
  currentCode: string;
}

export function InviteCodeManager({ currentCode }: InviteCodeManagerProps) {
  const [code, setCode] = useState(currentCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!confirm("Régénérer le code ? L'ancien code ne fonctionnera plus.")) return;
    setRegenerating(true);
    const result = await regenerateInviteCodeAction();
    if (result.newCode) {
      setCode(result.newCode);
    }
    setRegenerating(false);
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-wide"
        style={{ color: "var(--theme-primary)" }}
      >
        Code d'invitation
      </h2>
      <p className="mb-4 text-xs text-[var(--muted-foreground)]">
        Partagez ce code avec les habitants pour qu'ils puissent s'inscrire
        sans validation manuelle.
      </p>
      <div className="flex items-center gap-3">
        <code className="flex-1 rounded-lg bg-[#fafaf9] border border-[#e8dfd0] px-4 py-3 text-lg font-mono font-semibold tracking-widest text-[var(--foreground)]">
          {code}
        </code>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8dfd0] bg-white px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#fafaf9]"
        >
          <Copy size={14} />
          {copied ? "Copié !" : "Copier"}
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}
        >
          <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
          Régénérer
        </button>
      </div>
    </div>
  );
}
```

### Step 2.5: Create server action for regenerating invite code

- [ ] **Create `apps/web/src/app/admin/dashboard/invite-actions.ts`:**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function regenerateInviteCodeAction(): Promise<{ newCode: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { newCode: null, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("commune_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") return { newCode: null, error: "Non autorisé" };

  // Generate a new 12-char hex code
  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const { error } = await supabase
    .from("communes")
    .update({ invite_code: newCode })
    .eq("id", profile.commune_id);

  if (error) return { newCode: null, error: error.message };

  revalidatePath("/admin/dashboard");
  return { newCode, error: null };
}
```

### Step 2.6: Add InviteCodeManager to admin dashboard

- [ ] **Modify `apps/web/src/app/admin/dashboard/page.tsx`:**

Add import at top:
```tsx
import { InviteCodeManager } from "@/components/admin/invite-code-manager";
```

Fetch commune invite code — add after `getAuditLog` call (after line 46):

```tsx
  const { data: commune } = await supabase
    .from("communes")
    .select("invite_code")
    .eq("id", profile.commune_id)
    .single();
```

Add the component in the JSX, after `<SummaryCards>` and before `<PendingUsers>` (after line 109):

```tsx
      <InviteCodeManager currentCode={commune?.invite_code ?? ""} />
```

### Step 2.7: Verify and commit

- [ ] **Test:**
  - Admin dashboard shows invite code with copy and regenerate buttons
  - Copy button copies to clipboard
  - Regenerate button generates new code
  - Web signup: enter a valid invite code → user created with status "active", redirected to feed
  - Web signup: enter invalid invite code → error message
  - Web signup: no invite code → user created with status "pending", redirected to pending page
  - Same tests on mobile

- [ ] **Commit:**

```bash
git add packages/shared/src/validation/profile.schema.ts apps/web/src/app/auth/signup/page.tsx apps/mobile/src/app/auth/signup.tsx apps/web/src/components/admin/invite-code-manager.tsx apps/web/src/app/admin/dashboard/invite-actions.ts apps/web/src/app/admin/dashboard/page.tsx
git commit -m "feat(auth): commune invite code for auto-approved signup"
```

---

## Task 3: Image Upload & Display

### Step 3.1: Create migration for push_tokens table and avatars bucket

- [ ] **Create `supabase/migrations/005_push_tokens_and_avatars.sql`:**

```sql
-- Push tokens table (supports multiple devices per user)
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own tokens"
  ON push_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tokens"
  ON push_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON push_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Functions)
CREATE POLICY "Service role can read all tokens"
  ON push_tokens FOR SELECT TO service_role
  USING (true);

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');
```

- [ ] **Apply migration:**

Run: `npx supabase db reset`

### Step 3.2: Add image upload to web create post dialog

- [ ] **Modify `apps/web/src/app/app/feed/actions.ts`:**

The server action currently receives `FormData` but doesn't handle files. Update it to accept an image file.

Add image upload logic after the successful post insert (after line 141, after `if (error || !post) return...`):

```typescript
  // Upload image if provided
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop() ?? "webp";
    const storagePath = `posts/${post.id}/${Date.now()}.${ext}`;

    const arrayBuffer = await imageFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(storagePath, arrayBuffer, {
        contentType: imageFile.type,
      });

    if (!uploadError) {
      await supabase
        .from("post_images")
        .insert({ post_id: post.id, storage_path: storagePath });
    }
  }
```

Also add the same upload block for the word-filtered (hidden) post path, after the hidden post's poll creation (after line 124):

```typescript
  // Upload image for hidden post too
  const imageFileHidden = formData.get("image") as File | null;
  if (imageFileHidden && imageFileHidden.size > 0) {
    const ext = imageFileHidden.name.split(".").pop() ?? "webp";
    const storagePath = `posts/${post.id}/${Date.now()}.${ext}`;

    const arrayBuffer = await imageFileHidden.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(storagePath, arrayBuffer, {
        contentType: imageFileHidden.type,
      });

    if (!uploadError) {
      await supabase
        .from("post_images")
        .insert({ post_id: post.id, storage_path: storagePath });
    }
  }
```

- [ ] **Modify `apps/web/src/components/create-post-dialog.tsx`:**

Add state and a ref for the image file. Add after existing state (after line 50):

```tsx
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
```

Add a helper function for client-side resize, before `handleSubmit`:

```tsx
  async function resizeImage(file: File): Promise<File> {
    const MAX_WIDTH = 800;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    await new Promise((resolve) => { img.onload = resolve; });
    URL.revokeObjectURL(url);

    if (img.width <= MAX_WIDTH) return file;

    const ratio = MAX_WIDTH / img.width;
    const canvas = document.createElement("canvas");
    canvas.width = MAX_WIDTH;
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/webp", 0.8)
    );
    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  }
```

Update `handleSubmit` to include the resized image in FormData. After `formData.set("type", type)` (line 59):

```tsx
    if (imageFile) {
      const resized = await resizeImage(imageFile);
      formData.set("image", resized);
    }
```

Add image input in the form, before the submit button (before line 161):

```tsx
          <div className="space-y-2">
            <Label>Photo (optionnelle)</Label>
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-full max-h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white"
                >
                  Supprimer
                </button>
              </div>
            )}
            {!imagePreview && (
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-4 text-sm text-muted-foreground hover:border-gray-300 transition-colors">
                Ajouter une photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            )}
          </div>
```

Reset image state in the `setOpen(false)` callback when dialog closes. Update the success path (line 69):

```tsx
    setOpen(false);
    setLoading(false);
    setImageFile(null);
    setImagePreview(null);
    router.refresh();
```

### Step 3.3: Display post images in web PostCard

- [ ] **Modify `apps/web/src/components/post-card.tsx`:**

The post data already includes `post_images` from the query. Add image display.

Add at the top, a helper to get the Supabase storage public URL. After imports:

```tsx
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getImageUrl(storagePath: string, width?: number, height?: number) {
  const base = `${SUPABASE_URL}/storage/v1/object/public/post-images/${storagePath}`;
  if (width && height) {
    return `${base}?width=${width}&height=${height}&resize=cover`;
  }
  return base;
}
```

Add the image display inside the card, after the `<div className="px-5 py-4">` opening and before the title row. Insert after line 32:

```tsx
        {/* Post image */}
        {post.post_images && post.post_images.length > 0 && (
          <div className="mb-3 -mx-5 -mt-4 overflow-hidden rounded-t-[14px]">
            <img
              src={getImageUrl(post.post_images[0].storage_path, 600, 300)}
              alt=""
              className="w-full h-48 object-cover"
              loading="lazy"
            />
          </div>
        )}
```

### Step 3.4: Display post images in mobile PostCard

- [ ] **Modify `apps/mobile/src/components/post-card.tsx`:**

Add Image import:
```tsx
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
```

Add helper after imports:
```tsx
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

function getImageUrl(storagePath: string, width?: number, height?: number) {
  const base = `${SUPABASE_URL}/storage/v1/object/public/post-images/${storagePath}`;
  if (width && height) {
    return `${base}?width=${width}&height=${height}&resize=cover`;
  }
  return base;
}
```

Add image display inside the card, after `{post.is_pinned && (...pinnedBar...)}` and before `<View style={styles.inner}>` (after line 52):

```tsx
      {/* Post image */}
      {post.post_images && post.post_images.length > 0 && (
        <Image
          source={{ uri: getImageUrl(post.post_images[0].storage_path, 400, 200) }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
```

Add style:
```tsx
  postImage: {
    width: "100%",
    height: 160,
  },
```

### Step 3.5: Add client-side resize to mobile create post

- [ ] **Modify `apps/mobile/src/app/(tabs)/create.tsx`:**

Add import:
```tsx
import * as ImageManipulator from "expo-image-manipulator";
```

Note: `expo-image-manipulator` must be installed. Run:
```bash
cd apps/mobile && npx expo install expo-image-manipulator
```

Replace the existing image upload block (lines 200-210, inside `if (image) { ... }`) with:

```tsx
    if (image) {
      // Resize image before upload
      const manipResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
      );

      const ext = "webp";
      const path = `posts/${post.id}/${Date.now()}.${ext}`;

      const response = await fetch(manipResult.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, { contentType: "image/webp" });

      if (!uploadError) {
        await supabase
          .from("post_images")
          .insert({ post_id: post.id, storage_path: path });
      }
    }
```

### Step 3.6: Add avatar upload to web settings

- [ ] **Modify `apps/web/src/app/app/settings/settings-form.tsx`:**

Add avatar props and state. Update the interface:

```tsx
interface SettingsFormProps {
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}
```

Update the component signature:
```tsx
export function SettingsForm({ userId, initialDisplayName, initialAvatarUrl }: SettingsFormProps) {
```

Add state after existing state:
```tsx
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
```

Add the avatar upload handler before `handleSubmit`:

```tsx
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    // Resize client-side
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    await new Promise((resolve) => { img.onload = resolve; });
    URL.revokeObjectURL(url);

    const MAX = 400;
    const canvas = document.createElement("canvas");
    const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/webp", 0.85)
    );

    const supabase = createClient();
    const path = `${userId}/avatar.webp`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      setStatus("error");
      return;
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setUploadingAvatar(false);
    if (profileError) {
      setStatus("error");
    } else {
      setAvatarUrl(publicUrl);
      setStatus("success");
    }
  }
```

Add avatar section in the JSX, before the name form. After `<h2>` title:

```tsx
      {/* Avatar section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover border-2 border-[#f0e8da]"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white"
              style={{ backgroundColor: "var(--theme-primary)" }}
            >
              {initialDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <label className="cursor-pointer rounded-lg border border-[#e8dfd0] bg-white px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[#fafaf9]">
            {uploadingAvatar ? "Envoi..." : "Changer la photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
            />
          </label>
        </div>
      </div>
```

- [ ] **Modify `apps/web/src/app/app/settings/page.tsx`:** Pass `initialAvatarUrl` to the form.

The `getProfile` query already returns `avatar_url` from the profiles table. Update the `SettingsForm` usage (line 70-73):

```tsx
      <SettingsForm
        userId={profile.id}
        initialDisplayName={profile.display_name ?? ""}
        initialAvatarUrl={profile.avatar_url ?? null}
      />
```

### Step 3.7: Add avatar upload to mobile profile

- [ ] **Modify `apps/mobile/src/app/profile.tsx`:**

Add imports:
```tsx
import { Image, Pressable } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
```

Add state after existing state declarations:
```tsx
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
```

Add handler before `handleSaveName`:

```tsx
  async function handleAvatarUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;
    if (!profile) return;

    setUploadingAvatar(true);

    const manipResult = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 400 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.WEBP }
    );

    const response = await fetch(manipResult.uri);
    const blob = await response.blob();
    const path = `${profile.id}/avatar.webp`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/webp", upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      Alert.alert("Erreur", "Impossible d'envoyer la photo");
      return;
    }

    const publicUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    setUploadingAvatar(false);
    if (profileError) {
      Alert.alert("Erreur", "Impossible de mettre à jour le profil");
    } else {
      setAvatarUrl(publicUrl);
    }
  }
```

Replace the avatar section in the JSX (the `<View style={styles.avatarRing}>` block, lines 80-91) with:

```tsx
        <Pressable onPress={handleAvatarUpload} disabled={uploadingAvatar}>
          <View
            style={[styles.avatarRing, { borderColor: theme.primary + "50" }]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.changePhotoText, { color: theme.primary }]}>
            {uploadingAvatar ? "Envoi..." : "Changer la photo"}
          </Text>
        </Pressable>
```

Add styles:
```tsx
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  changePhotoText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },
```

### Step 3.8: Verify and commit

- [ ] **Test image upload:**
  - Web: Create a post with image → image appears in feed card
  - Mobile: Create a post with image → image resized to WebP, appears in feed
  - Verify Supabase Storage shows the files under `post-images/posts/`
  - Click image in post card → opens full-size in post detail

- [ ] **Test avatar upload:**
  - Web settings: Upload avatar → appears as profile picture
  - Mobile profile: Upload avatar → replaces initials circle
  - Verify avatar shows in post cards (existing query already includes `avatar_url`)

- [ ] **Commit:**

```bash
git add supabase/migrations/005_push_tokens_and_avatars.sql apps/web/src/components/create-post-dialog.tsx apps/web/src/app/app/feed/actions.ts apps/web/src/components/post-card.tsx apps/mobile/src/components/post-card.tsx apps/mobile/src/app/\(tabs\)/create.tsx apps/web/src/app/app/settings/settings-form.tsx apps/mobile/src/app/profile.tsx
git commit -m "feat: image upload with resize + avatar upload + display in feed"
```

---

## Task 4: Push Notifications (Expo Push)

### Step 4.1: Fix mobile notification token registration

- [ ] **Modify `apps/mobile/src/lib/notifications.ts`:**

The current code tries to upsert to a `push_tokens` table that didn't exist before our migration. Now it does. Update the upsert to match the new table schema.

Replace the token upsert block (lines 29-31) with:

```typescript
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("push_tokens")
      .upsert(
        { user_id: user.id, token, platform: Platform.OS },
        { onConflict: "token" }
      );
  }
```

### Step 4.2: Add token cleanup on logout

- [ ] **Modify `apps/mobile/src/lib/notifications.ts`:**

Add a function to remove the token on logout. Append to file:

```typescript
export async function unregisterPushToken(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", token);
  } catch {
    // Token cleanup is best-effort
  }
}
```

- [ ] **Modify `apps/mobile/src/app/profile.tsx`:** Call `unregisterPushToken` on logout.

Add import:
```tsx
import { unregisterPushToken } from "@/lib/notifications";
```

In `handleLogout`, add before `supabase.auth.signOut()`:
```tsx
          await unregisterPushToken();
```

### Step 4.3: Update Edge Function for push_tokens table and evenement support

- [ ] **Replace `supabase/functions/push-notification/index.ts`:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POST_TYPE_TITLES: Record<string, string> = {
  annonce: "Annonce officielle",
  evenement: "Nouvel événement",
};

serve(async (req) => {
  const { record } = await req.json();
  const postType = record.type as string;

  // Only send push for annonce and evenement
  if (!POST_TYPE_TITLES[postType]) {
    return new Response("Post type not notifiable", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all active users in the commune, then their push tokens
  const { data: communeProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("commune_id", record.commune_id)
    .eq("status", "active");

  const userIds = (communeProfiles ?? []).map((p) => p.id);

  if (userIds.length === 0) {
    return new Response("No active users", { status: 200 });
  }

  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token, user_id")
    .in("user_id", userIds);

  if (!tokens || tokens.length === 0) {
    // Fallback: try legacy push_token column on profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("commune_id", record.commune_id)
      .eq("status", "active")
      .not("push_token", "is", null);

    if (!profiles || profiles.length === 0) {
      return new Response("No tokens found", { status: 200 });
    }

    const legacyTokens = profiles.map((p) => p.push_token).filter(Boolean);
    await sendPush(legacyTokens, postType, record);
    return new Response("Sent via legacy tokens", { status: 200 });
  }

  // Filter out the post author (don't notify them of their own post)
  const pushTokens = tokens
    .filter((t) => t.user_id !== record.author_id)
    .map((t) => t.token);

  if (pushTokens.length === 0) {
    return new Response("No recipients", { status: 200 });
  }

  await sendPush(pushTokens, postType, record);
  return new Response("Sent", { status: 200 });
});

async function sendPush(
  tokens: string[],
  postType: string,
  record: { id: string; title: string }
) {
  const title = POST_TYPE_TITLES[postType] ?? "Nouvelle publication";
  const body = record.title.length > 80
    ? record.title.substring(0, 77) + "..."
    : record.title;

  // Expo push API accepts batches of up to 100
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(
        chunk.map((token) => ({
          to: token,
          title,
          body,
          data: { postId: record.id, url: `/post/${record.id}` },
          sound: "default",
        }))
      ),
    });
  }
}
```

### Step 4.4: Update notification tap handler in mobile

- [ ] **Modify `apps/mobile/src/hooks/use-notifications.ts`:**

The existing handler already navigates based on `data.url`. Update it to also handle `data.postId` for backward compatibility:

Replace the response listener (line 15) with:

```tsx
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.url && typeof data.url === "string") {
        router.push(data.url as any);
      } else if (data?.postId && typeof data.postId === "string") {
        router.push(`/post/${data.postId}` as any);
      }
    });
```

### Step 4.5: Integrate useNotifications in app layout

- [ ] **Check `apps/mobile/src/app/_layout.tsx`** to see if `useNotifications` is already called. If not, add it.

Read the file and add inside the root layout component:

```tsx
import { useNotifications } from "@/hooks/use-notifications";
```

Then inside the component body:
```tsx
  useNotifications();
```

### Step 4.6: Set up database webhook for push notifications

- [ ] **Verify the database webhook is configured.**

In Supabase dashboard (or in the `supabase/config.toml` for local dev), ensure there's a webhook that triggers the `push-notification` Edge Function on `INSERT` into the `posts` table. If using local dev, add to `supabase/config.toml`:

```toml
[functions.push-notification]
verify_jwt = false
```

For production, configure the webhook via Supabase Dashboard → Database → Webhooks → New webhook:
- Table: `posts`
- Events: `INSERT`
- Type: Supabase Edge Function
- Function: `push-notification`

### Step 4.7: Verify and commit

- [ ] **Test push notifications:**
  - Start Expo app on a physical device (push won't work in simulator)
  - Log in, verify token appears in `push_tokens` table
  - Log out, verify token is deleted
  - From admin account, create an `annonce` → verify push received
  - Create an `evenement` → verify push received
  - Create a `discussion` → verify NO push sent
  - Tap push notification → verify app opens post detail

- [ ] **Commit:**

```bash
git add apps/mobile/src/lib/notifications.ts apps/mobile/src/app/profile.tsx supabase/functions/push-notification/index.ts apps/mobile/src/hooks/use-notifications.ts apps/mobile/src/app/_layout.tsx
git commit -m "feat: Expo push notifications for annonce and evenement posts"
```

---

## Final: Update CLAUDE.md

- [ ] **Update `CLAUDE.md`** current status section:

```markdown
## Current Status

- **v1 complete**: auth (with password reset, invite codes), feed (paginated), post detail, events (calendar), mon espace, infos pratiques, admin panel, public commune site, image upload with resize, profile pictures, push notifications (Expo), moderation (reports, word filter, audit log, moderator role)
- **v2 ~80%**: commune website pages (accueil, events, infos pratiques) — missing: bulletin, conseil municipal, associations, contact, legal mentions
- **Remaining v2**: bulletin municipal, conseil municipal, associations, contact page, legal mentions, custom domain
```

- [ ] **Commit:**

```bash
git add CLAUDE.md
git commit -m "docs: update status — v1 complete"
```
