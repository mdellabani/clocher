import Link from "next/link";
import type { InboxConversation } from "@rural-community-platform/shared";

export function InboxList({
  rows,
  onLoadMore,
}: {
  rows: InboxConversation[];
  onLoadMore?: () => void;
}) {
  if (rows.length === 0) {
    return <p className="mt-6 text-sm text-[#7a5e4d]">Aucun message pour le moment.</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-[#f0e0d0]">
      {rows.map((c) => (
        <li key={c.id}>
          <Link href={`/app/messages/${c.id}`} className="flex items-start gap-3 py-3">
            {c.unread && (
              <span
                aria-label="non lu"
                className="mt-2 h-2 w-2 rounded-full bg-[#BF3328]"
              />
            )}
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="font-semibold text-[#2a1a14]">
                  {c.counterpart.display_name}
                </span>
                <span className="text-xs text-[#7a5e4d]">
                  {new Date(c.last_message_at).toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="text-xs text-[#7a5e4d]">
                à propos de : {c.post.title}
              </div>
              {c.last_message_preview && (
                <div className="mt-1 text-sm text-[#5a4030] line-clamp-1">
                  {c.last_message_preview}
                </div>
              )}
            </div>
          </Link>
        </li>
      ))}
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
