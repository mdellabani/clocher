# v1 Completion Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Scope:** Finish v1 — password reset, image upload, push notifications, commune invite code

## 1. Password Reset

Supabase Auth built-in flow, UI only.

**Web flow:**
- Login screen: "Mot de passe oublié ?" link
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })`
- Supabase sends magic link email (template customized in French via Supabase dashboard)
- `/auth/reset-password` page: user enters new password → `supabase.auth.updateUser({ password })`

**Mobile flow:**
- Login screen: same link, opens web reset page in system browser
- Deep link / universal link brings user back to the app after reset

**No migration needed.** Auth is Supabase-managed.

## 2. Image Upload & Storage

### Storage Setup

- Supabase Storage bucket: `images` (public)
- Folder structure: `posts/{user_id}/{uuid}.webp`, `avatars/{user_id}/avatar.webp`
- RLS: authenticated users upload to their own `{user_id}/` path, anyone can read

### Post Images

- 1 image per post, optional
- Create post form gets "Ajouter une photo" button
  - Web: file input
  - Mobile: existing `image-picker-button.tsx`
- Client-side resize before upload: max 800px wide, WebP, cap 500KB
  - Web: `canvas` API → `toBlob('image/webp')`
  - Mobile: `expo-image-manipulator`
- Upload path: `images/posts/{user_id}/{uuid}.webp`
- Store path in `posts.image_path`

### Thumbnails

- Supabase Storage image transformation API for feed cards: `?width=400&height=300&resize=cover`
- No separate thumbnail storage — on-the-fly transform with caching
- Post detail page loads full-size image
- Clicking image in post card opens full-size view

### Profile Pictures

- Default: initials-based avatar, generated client-side
  - First letter of first name + last name
  - Background color derived from deterministic hash of `user_id`
- Upload option in mon espace / settings
  - Same resize pipeline: 800px max, WebP
  - Upload path: `images/avatars/{user_id}/avatar.webp`
- `profiles.avatar_url` column (null = use initials default)

### Migration

```sql
ALTER TABLE posts ADD COLUMN image_path TEXT;
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
```

## 3. Push Notifications (Expo Push)

### Device Token Management

- On mobile app launch (post-auth), request permissions via `expo-notifications`
- Store Expo push token in new `push_tokens` table
- Users can have multiple tokens (multiple devices)
- On logout, delete token for that device

### push_tokens Table

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users manage their own tokens only
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### Edge Function: send-push-notification

- Triggered via database webhook on `INSERT` into `posts`
- Only fires for: `annonce`, `evenement` post types
- Logic:
  1. Read new post's `commune_id`
  2. Query all push tokens for users in that commune (join `push_tokens` → `profiles` on `user_id` where `profiles.commune_id` matches)
  3. Batch calls to Expo Push API (`https://exp.host/--/api/v2/push/send`)
  4. Log delivery status

### Notification Content

- Title: post type label ("Annonce officielle", "Nouvel événement")
- Body: truncated post title (80 chars max)
- Data payload: `{ post_id }` — tap opens post detail screen

### Not in Scope

- Notification preferences (opt-in/out per type)
- Web push
- Notification history / inbox screen

## 4. Commune Invite Code

### Mechanism

- Admin generates an invite code from admin panel (e.g. "SAINT-MARTIN-2026")
- Stored in `communes.invite_code` column
- Admin can regenerate at any time (old code invalidated immediately)
- Displayed in admin dashboard with copy button

### Signup Flow Change

- Signup form gets "Code de la commune" field
- On submit:
  - If code provided: validate against `communes.invite_code`, resolve `commune_id`, create user with status `approved`
  - If no code: current flow (pick commune, status `pending`, admin approves manually)
- Server-side validation of code

### Security

- Codes are shared publicly (village context) — no rate limiting on validation
- Admin rotates code if needed
- One active code per commune, no expiry management

### Migration

```sql
ALTER TABLE communes ADD COLUMN invite_code TEXT UNIQUE;

-- Generate initial codes for existing communes
UPDATE communes SET invite_code = upper(substring(md5(random()::text) from 1 for 8));
```

### Admin UI

- Section in admin dashboard: "Code d'invitation"
- Shows current code, copy button, "Régénérer" button

## Build Order

1. **Password reset** — simplest, unblocks real users immediately
2. **Commune invite code** — small migration + UI, high impact for onboarding
3. **Image upload** — most visible feature, needs Storage setup
4. **Push notifications** — most complex, needs Edge Function + device token management

## Deferred to v-next

- Phone sign-up (SMS cost)
- Web push notifications
- Notification preferences / inbox
- Illustrated avatar gallery
- Multiple images per post
