import Link from "next/link";
import type { InboxConversation } from "@pretou/shared";

const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatRowTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return TIME_FORMATTER.format(d);
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Hier";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "2-digit",
  });
}

function getInitial(name: string | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function InboxList({
  rows,
  onLoadMore,
}: {
  rows: InboxConversation[];
  onLoadMore?: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5dbc8] text-2xl">
          ✉
        </div>
        <p className="text-base font-semibold text-[#2a1a14]">Aucun message</p>
        <p className="max-w-xs text-sm text-[#7a5e4d]">
          Vos conversations apparaîtront ici. Lancez-en une depuis une
          publication.
        </p>
      </div>
    );
  }
  return (
    <ul className="mt-4 flex flex-col">
      {rows.map((c) => {
        const unread = !!c.unread;
        return (
          <li key={c.id}>
            <Link
              href={`/app/messages/${c.id}`}
              className={`flex items-center gap-3 border-b border-[#f0e0d0] px-3 py-3 transition hover:bg-[#f5dbc8]/40 ${
                unread ? "bg-[#f5dbc8]/30" : ""
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5dbc8] text-base font-semibold text-[#BF3328] ${
                  unread ? "ring-2 ring-[#BF3328]" : ""
                }`}
                aria-hidden
              >
                {getInitial(c.counterpart.display_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-[15px] text-[#2a1a14] ${
                      unread ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {c.counterpart.display_name}
                  </span>
                  <span
                    className={`shrink-0 text-[11px] tabular-nums ${
                      unread
                        ? "font-semibold text-[#BF3328]"
                        : "text-[#7a5e4d]"
                    }`}
                  >
                    {formatRowTime(c.last_message_at)}
                  </span>
                </div>
                <div className="truncate text-xs text-[#7a5e4d]">
                  {c.post.title}
                </div>
                {c.last_message_preview && (
                  <div
                    className={`mt-1 truncate text-[13px] ${
                      unread
                        ? "font-medium text-[#2a1a14]"
                        : "text-[#7a5e4d]"
                    }`}
                  >
                    {c.last_message_preview}
                  </div>
                )}
              </div>
              {unread && (
                <span
                  aria-label="non lu"
                  className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#BF3328]"
                />
              )}
            </Link>
          </li>
        );
      })}
      {onLoadMore && (
        <li className="py-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="text-sm text-[#BF3328] underline"
          >
            Charger plus
          </button>
        </li>
      )}
    </ul>
  );
}
