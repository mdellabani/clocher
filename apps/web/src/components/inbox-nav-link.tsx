"use client";
import Link from "next/link";
import { useUnreadCount } from "@/hooks/queries/use-unread-count";
import { useRealtimeConversations } from "@/hooks/use-realtime-conversations";
import { useProfile } from "@/hooks/use-profile";

export function InboxNavLink({ className }: { className: string }) {
  const { data } = useUnreadCount();
  const { profile } = useProfile();
  // Keep the badge fresh while the user is anywhere in the app, not just on
  // the messages page. Invalidates ["conversations"] (which prefix-covers
  // unread-count) on any conversations table change for this user.
  useRealtimeConversations(profile?.id);
  const count = data ?? 0;
  return (
    <Link href="/app/messages" className={`relative ${className}`}>
      Messages
      {count > 0 && (
        <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#BF3328] px-1.5 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
