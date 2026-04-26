# Direct Messaging — Design

**Date:** 2026-04-26
**Status:** Approved (pending implementation plan)
**Replaces:** Comments feature, moderator role, manual moderation queue

## 1. Context

Comments and a manual moderation queue (with a `moderator` role) are being removed. They put non-trivial day-to-day work on the mairie secretary — exactly the audience this product needs to keep frictionless. They are replaced by **per-post direct messages** (leboncoin-style): each post gets a "Contacter" button that opens a private 1:1 thread anchored to that post.

Moderation shifts from "humans triage reports" to "automated checks on publish + retroactively on report". The existing `word_filters` and `audit_log` tables become the automated moderation backbone; AI/algorithmic upgrades will plug into the same interface later.

## 2. Decisions captured during brainstorming

1. **Per-post threads.** A conversation is anchored to a `post_id` and a pair of users. There is no general user-to-user DM outside a post.
2. **Automated moderation only.** The `moderator` role and the admin moderation queue are removed. The `word_filters` and `audit_log` tables persist; word filter runs pre-publish and again retroactively when a report lands.
3. **DMs are private.** No content filter on outgoing messages. Recipients can block + report; reports go to the super-admin only and trigger a retroactive word-filter pass.
4. **Annonces have no DM affordance.** Each `annonce` post renders an inline contact block (phone, email, opening hours) read from existing `commune.contact_*` fields. The mairie does not become a DM target.
5. **Push on every new DM, coalesced per conversation.** If the recipient already has an unread message in the same thread, the push is skipped. Coalescing is server-side, using `last_read_at`.
6. **Cross-commune DMs allowed**, with a locality banner on the thread header.
7. **Existing comments wiped.** Pre-launch reset; demo and prod DBs get recreated from a single rewritten `001_initial_schema.sql`.

## 3. Workflows

### A new message
```
Pierre's app inserts row → DB messages table
                            ↓ (Postgres trigger)
                        Edge Function notify_new_message
                            ↓ (calls Expo)
                        Expo Push API
                            ↓
                        Jeanne's phone
```

### Live in-app updates (web + mobile)
```
Any messages/conversations row change
        ↓
Supabase Realtime broadcasts via WebSocket
        ↓
Subscribed clients update inbox + unread badge
```

### Marking a thread read
```
User opens thread → app calls RPC mark_conversation_read(conv_id)
                       ↓
                    DB updates the user's last_read_at column
```

### Reporting a conversation
```
User taps Report → row inserted in conversation_reports
                      ↓ (trigger)
                    word_filter retroactive pass on the message bodies
                      ↓
                    Super-admin sees the report (with hits flagged) in the super-admin dashboard
```

## 4. Architecture overview

| Concern | Lives in |
|---|---|
| Tables, RLS, RPCs, triggers | Postgres |
| Push side-effect (HTTP to Expo) | Supabase Edge Function `notify_new_message` |
| Types, query helpers, validation | `packages/shared` |
| Inbox + thread UI | `apps/web` and `apps/mobile` (independent, both consume `packages/shared`) |
| Live updates | Supabase Realtime (no app code beyond a `.subscribe()` call) |

Web and mobile are siblings. Neither depends on the other; both depend on `packages/shared`. The DB and Edge Function don't know which client called.

## 5. Database schema

The schema below is folded directly into the rewritten `supabase/migrations/001_initial_schema.sql`. No new migration file is added — see Section 11 for the packaging.

### New tables

```sql
-- One row per (post, pair-of-users). The inbox unit.
create table conversations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  user_a_last_read_at timestamptz,
  user_b_last_read_at timestamptz,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_message_sender_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint conv_user_order check (user_a < user_b),
  constraint conv_users_distinct check (user_a <> user_b),
  unique (post_id, user_a, user_b)
);

create index conv_user_a_idx on conversations(user_a, last_message_at desc);
create index conv_user_b_idx on conversations(user_b, last_message_at desc);
create index conv_post_idx on conversations(post_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index msg_conversation_idx on messages(conversation_id, created_at);
create index msg_sender_idx on messages(sender_id);

create table user_blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_self check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on user_blocks(blocked_id);

create table conversation_reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text,
  word_filter_hit boolean not null default false,
  word_filter_matches text[],
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index conv_reports_unresolved_idx on conversation_reports(created_at desc) where resolved_at is null;
```

### Tables/objects removed

- `comments` table (dropped).
- `moderator` role check function and any RLS clauses that referenced it.

### Tables that stay

- `reports` — used for post reports. The flow becomes automated (word filter retroactive recheck) instead of a moderator queue.
- `word_filters` — pre-publish and retroactive checks.
- `audit_log` — paper trail for automated actions and super-admin actions.

## 6. RLS policies

### Helpers

```sql
create function are_users_blocked(a uuid, b uuid)
  returns boolean
  language sql stable security definer
as $$
  select exists (
    select 1 from user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create function is_conversation_participant(conv_id uuid)
  returns boolean
  language sql stable security definer
as $$
  select exists (
    select 1 from conversations
    where id = conv_id and (user_a = auth.uid() or user_b = auth.uid())
  );
$$;
```

### `conversations`

```sql
alter table conversations enable row level security;

create policy conv_select_self on conversations
  for select using (
    (auth.uid() = user_a or auth.uid() = user_b)
    and not are_users_blocked(user_a, user_b)
  );

create policy conv_insert_self on conversations
  for insert with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and not are_users_blocked(user_a, user_b)
    and exists (
      select 1 from posts p
      where p.id = post_id
        and p.type <> 'annonce'
        and p.is_hidden = false
        and p.author_id <> auth.uid()
    )
  );

-- No UPDATE policy: mark-as-read goes through mark_conversation_read RPC.
-- No DELETE policy: cascades from post deletion only.
```

### `messages`

```sql
alter table messages enable row level security;

create policy msg_select_participant on messages
  for select using (
    is_conversation_participant(conversation_id)
    and not exists (
      select 1 from conversations c
      where c.id = conversation_id
        and are_users_blocked(c.user_a, c.user_b)
    )
  );

create policy msg_insert_self on messages
  for insert with check (
    sender_id = auth.uid()
    and is_conversation_participant(conversation_id)
    and not exists (
      select 1 from conversations c
      where c.id = conversation_id
        and are_users_blocked(c.user_a, c.user_b)
    )
  );

create policy msg_select_superadmin on messages
  for select using (is_super_admin());

-- Messages are immutable: no UPDATE, no DELETE.
```

### `user_blocks`

```sql
alter table user_blocks enable row level security;

create policy blocks_select_self on user_blocks
  for select using (blocker_id = auth.uid());

create policy blocks_insert_self on user_blocks
  for insert with check (blocker_id = auth.uid());

create policy blocks_delete_self on user_blocks
  for delete using (blocker_id = auth.uid());
```

### `conversation_reports`

```sql
alter table conversation_reports enable row level security;

create policy reports_select_reporter on conversation_reports
  for select using (reporter_id = auth.uid());

create policy reports_select_superadmin on conversation_reports
  for select using (is_super_admin());

create policy reports_insert_participant on conversation_reports
  for insert with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy reports_update_superadmin on conversation_reports
  for update using (is_super_admin());
```

### `posts` — block-extension

The existing `posts` SELECT policy is extended with one additional clause so a blocked user's posts disappear from the blocker's feed:

```sql
-- existing policy gains:
-- AND not exists (
--   select 1 from user_blocks
--   where blocker_id = auth.uid() and blocked_id = posts.author_id
-- )
```

### Mark-as-read RPC

```sql
create function mark_conversation_read(conv_id uuid)
  returns void
  language plpgsql security definer
as $$
begin
  update conversations
  set user_a_last_read_at = case when user_a = auth.uid() then now() else user_a_last_read_at end,
      user_b_last_read_at = case when user_b = auth.uid() then now() else user_b_last_read_at end
  where id = conv_id
    and (user_a = auth.uid() or user_b = auth.uid());
end;
$$;

grant execute on function mark_conversation_read to authenticated;
```

## 7. Push notification flow

### Trigger

A Postgres `AFTER INSERT` trigger on `messages` calls the Edge Function `notify_new_message` via `supabase_functions.http_request`.

### Edge Function `supabase/functions/notify_new_message/index.ts`

Responsibilities, in order:

1. Read `{ conversation_id, message_id, sender_id }` from the trigger payload.
2. Resolve the recipient (the participant who is not the sender) and their `last_read_at`.
3. **Coalescing check.** Count messages in this conversation, sent by the other party, since the recipient's `last_read_at`, **excluding** the just-inserted message. If count ≥ 1, the recipient already has an unread notification pending — exit without calling Expo.
4. Look up the recipient's active push tokens in `push_tokens`. Zero tokens (e.g., web-only user) → exit.
5. POST to `https://exp.host/--/api/v2/push/send` with:
   - `to`: token
   - `title`: sender display name
   - `body`: trimmed message body (≤ 100 chars)
   - `data`: `{ conversation_id, post_id, sender_id }` for deep-link routing
   - `categoryId`: `"message"`
   - `_displayInForeground`: false
   - `apnsCollapseId`: `conversation_id` (iOS dedup)

Coalescing is the source of truth. The `apnsCollapseId` is defense-in-depth in case any push slips through during a race.

### Web has no OS-level push

Web users see in-app live updates via Supabase Realtime when a tab is open. When a tab is closed, they get nothing — they catch up on next visit. Browser push (Web Push API + service worker + VAPID) is **out of scope** and can be added later as a self-contained add-on.

## 8. Shared queries layer

`packages/shared/src/queries/messages.ts` exports platform-agnostic functions (each takes a `SupabaseClient`):

- `getConversations(supabase, { limit, before })` — paginated inbox.
- `getMessages(supabase, conversationId, { limit, before })` — paginated thread.
- `getOrCreateConversation(supabase, { postId, otherUserId })` — opens a thread; canonicalizes `(user_a, user_b)` ordering.
- `sendMessage(supabase, { conversationId, body })` — inserts a message after the conversation exists.
- `markConversationRead(supabase, conversationId)` — calls the RPC.
- `blockUser(supabase, blockedUserId)` / `unblockUser(supabase, blockedUserId)`.
- `reportConversation(supabase, { conversationId, reason })`.
- `getMyBlocks(supabase)`.

Types live in `packages/shared/src/types/message.ts` (regenerated from `database.ts` plus a hand-written narrow type for the inbox row joining commune + counterpart name).

`packages/shared/src/validation/message.ts` exports a Zod schema (`sendMessageSchema`) used by the web server actions and the mobile client.

## 9. UI surfaces

### "Contacter" button

- Rendered on `PostCard` for `entraide`, `service`, `evenement`, `discussion`.
- Hidden on `annonce` (annonces show the inline contact block instead).
- Hidden when the viewer is the post author.
- Tap → calls `getOrCreateConversation` then routes to the thread.

### Inbox

- **Web:** `/app/messages`, with an icon + unread badge in the top nav. List sorted by `last_message_at desc`. Infinite-scroll pagination via cursor on `last_message_at`.
- **Mobile:** the existing `Exchanges` tab is repurposed as the inbox. Same data, same sort, same pagination shape.

Each inbox row shows: counterpart name + avatar, post title (small), last message preview (1 line, truncated), relative timestamp, unread dot.

### Thread screen

- **Web:** `/app/messages/[convId]`.
- **Mobile:** stack-pushed from the inbox.
- Header: counterpart name (link to profile if profiles are public), post title (link back to post), overflow menu (Block, Report).
- Cross-commune banner: `Vous écrivez à un habitant de {commune}` when participants belong to different communes.
- Message list: oldest-to-newest, infinite-scroll backwards.
- Composer: text area + send button. Empty/whitespace-only disables send. Soft cap 4000 chars enforced client-side; CHECK constraint enforces it server-side.

### Annonce inline contact block

Rendered at the bottom of every `annonce` card (feed, detail, public commune site). Reads from `commune.contact_phone`, `commune.contact_email`, `commune.opening_hours`. Phone is listed first (rural elderly bias toward calling), each line is a tap-to-call / tap-to-mail link, opening hours is informational. **Each line is hidden if the underlying field is null** — a commune with no email yet shows only phone + hours. If all three fields are null the block is omitted entirely.

### Block + Report

- **Block:** confirmation dialog ("Bloquer {name} ? Vous ne verrez plus ses publications ni ses messages."). On confirm, inserts into `user_blocks`; the thread immediately disappears from the inbox, and the user's posts vanish from the feed.
- **Report:** simple dialog with an optional `reason` text field. On submit, inserts into `conversation_reports`. The user sees a confirmation toast.

## 10. RLS test matrix

All RLS-touching code gets exhaustive integration tests under `apps/web/src/__tests__/integration/messaging-rls.test.ts`, running against real local Supabase.

**Two non-negotiables:**
1. Every test asserts an exact row count or a specific error code. Never `expect(error).toBeNull()` alone — RLS denials return zero rows with HTTP 200, indistinguishable from "feature works" without an explicit count check.
2. Each test seeds its own minimal graph rather than relying on the global seed — a seed change must not silently turn a passing test into a vacuously-passing one.

**Test fixtures (per file):**

```
- Saint-Médard
  - admin@stmed (commune admin)
  - pierre@stmed, jeanne@stmed, sophie@stmed (residents)
- Arthez-de-Béarn (same EPCI)
  - marie@arthez
- Other-EPCI village (different EPCI)
  - paul@other
- super@admin (super-admin)

Posts:
- jeanne_entraide (entraide, by jeanne)
- pierre_service  (service,  by pierre)
- mairie_annonce  (annonce,  by admin@stmed)
- jeanne_hidden   (entraide by jeanne, is_hidden = true)
```

### `conversations` SELECT — 8 cases

| # | Actor | Setup | Expected |
|---|---|---|---|
| 1 | pierre | conv pierre↔jeanne on jeanne_entraide | 1 row visible |
| 2 | jeanne | same | 1 row visible |
| 3 | sophie | same | 0 rows |
| 4 | pierre | + jeanne blocked pierre | 0 rows |
| 5 | jeanne | + pierre blocked jeanne | 0 rows |
| 6 | super@admin | unrelated | 0 rows |
| 7 | unauthenticated | any | 0 rows |
| 8 | marie (cross-commune) | conv pierre↔marie | both see it |

### `conversations` INSERT — 9 cases

| # | Actor | Target | Expected |
|---|---|---|---|
| 1 | pierre | start conv with jeanne on jeanne_entraide | success |
| 2 | pierre | neither user_a nor user_b = pierre | rejected |
| 3 | pierre | start conv on `mairie_annonce` | rejected |
| 4 | pierre | start conv on `jeanne_hidden` | rejected |
| 5 | jeanne | start conv with herself on her own post | rejected (CHECK + author_id guard) |
| 6 | pierre | jeanne already blocked pierre | rejected |
| 7 | pierre | conv with marie (same EPCI) | success |
| 8 | pierre | conv with paul (different EPCI, post not in feed) | rejected (post not visible) |
| 9 | unauthenticated | anything | rejected |

### `messages` SELECT — 6 cases

| # | Actor | Expected |
|---|---|---|
| 1 | pierre on his own conv | sees all |
| 2 | jeanne on the same conv | sees all |
| 3 | sophie | 0 rows |
| 4 | pierre after jeanne blocked pierre | 0 rows |
| 5 | super@admin | sees all |
| 6 | unauthenticated | 0 rows |

### `messages` INSERT — 6 cases

| # | Actor | Setup | Expected |
|---|---|---|---|
| 1 | pierre | sender_id = pierre, his conv | success |
| 2 | pierre | sender_id = jeanne (impersonation) | rejected |
| 3 | sophie | conv she's not in | rejected |
| 4 | pierre | jeanne blocked pierre | rejected |
| 5 | pierre | body = "" | rejected (CHECK) |
| 6 | pierre | body = "x".repeat(5000) | rejected (CHECK) |

### `user_blocks` — 5 cases

| # | Actor | Op | Expected |
|---|---|---|---|
| 1 | pierre | blocker=pierre, blocked=jeanne | success |
| 2 | pierre | blocker=jeanne (impersonation) | rejected |
| 3 | pierre | blocker=blocked=pierre (self-block) | rejected (CHECK) |
| 4 | pierre | select | sees only own |
| 5 | pierre | delete own | success |

### `conversation_reports` — 5 cases

| # | Actor | Op | Expected |
|---|---|---|---|
| 1 | pierre (participant) | insert on his conv | success |
| 2 | sophie (non-participant) | insert | rejected |
| 3 | pierre | reporter_id=jeanne (impersonation) | rejected |
| 4 | super@admin | select all | sees all |
| 5 | super@admin | update resolved_at | success |

### `posts` SELECT — block extension — 2 cases

| # | Actor | Setup | Expected |
|---|---|---|---|
| 1 | pierre | jeanne posts entraide, pierre blocks jeanne | post NOT in pierre's feed |
| 2 | pierre | unblock | post returns |

### Helpers + RPC — 5 cases

| # | Test | Expected |
|---|---|---|
| 1 | `select are_users_blocked(pierre, jeanne)` after jeanne blocked pierre | true |
| 2 | same after both unblocked | false |
| 3 | pierre calls `mark_conversation_read` on his conv | only pierre's `last_read_at` updates |
| 4 | sophie calls it on a conv she's not in | no rows updated, no error |
| 5 | pierre direct UPDATE of `user_a_last_read_at` | rejected (no UPDATE policy) |

**Total: ~46 cases.** Existing comment-related tests are deleted in the same change; existing moderation tests are deleted entirely.

## 11. Migration packaging and deployment

This is a **one-time pre-launch reset**. After it lands, the standard "never edit `001_initial_schema.sql` post-deploy; add a new timestamped migration" rule resumes.

**Files modified:**
- `supabase/migrations/001_initial_schema.sql` — rewritten in place. Adds the four new tables, their indexes, RLS policies, helpers, and the `mark_conversation_read` RPC. Drops `comments`. Removes the `moderator` role check function and policies. Folds in the still-relevant `admin_can_update_own_commune` policy.
- `supabase/seed.sql` — drops comment seeding; adds a few demo conversations + messages so demo communes look alive.
- `packages/shared/src/types/database.ts` — regenerated via `npx supabase gen types typescript --local`.
- `CLAUDE.md` — updates the migration guidance, removes references to comments and the moderator role, adds messaging to the architecture/conventions sections.

**Files deleted:**
- `supabase/migrations/20260417000000_admin_can_update_own_commune.sql` (folded into `001`).
- `supabase/migrations/20260417000100_moderators_can_moderate_posts.sql` (moderator role gone).

**Edge function:**
- `supabase/functions/notify_new_message/index.ts` — new.

**Code deletions** (full list in Section 9 cull):
- Comment components, hooks, queries, types.
- `apps/web/src/app/moderation/*` (entire folder).
- Comment-related and moderation-related tests.

**Deployment:**
- Local: `npx supabase db reset`.
- Demo + prod: `./scripts/db-deploy.sh demo` then `./scripts/db-deploy.sh prod` (full overwrite path; both DBs are wiped and reapplied — demo data is throwaway, prod is empty).
- Edge function: `npx supabase functions deploy notify_new_message --project-ref <ref>` against demo and prod.

## 12. Out of scope (deferred)

- Browser push notifications (Web Push API + service worker + VAPID).
- Per-message read receipts.
- Quiet hours.
- Notification preferences UI ("mute this conversation").
- Server-side rate limiting on push or send.
- Group threads (anything beyond strict 1:1).
- Message edit / delete (messages remain immutable for now).
- AI/algorithmic moderation upgrades — the `word_filters` interface is the future plug-in point.
