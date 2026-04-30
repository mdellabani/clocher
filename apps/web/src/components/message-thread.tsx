"use client";
import type { MessageRow } from "@pretou/shared";

const DAY_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, yesterday)) return "Hier";
  const label = DAY_FORMATTER.format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getInitial(name: string | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function MessageThread({
  messages,
  myUserId,
  counterpartName,
}: {
  messages: MessageRow[];
  myUserId?: string;
  counterpartName?: string;
}) {
  if (messages.length === 0) {
    return (
      <div className="my-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5dbc8] text-2xl">
          ✉
        </div>
        <p className="text-sm font-medium text-[#2a1a14]">
          Pas encore de message
        </p>
        <p className="text-xs text-[#7a5e4d]">
          Écrivez le premier message pour démarrer la conversation.
        </p>
      </div>
    );
  }

  let lastDayKey = "";
  let lastSenderId: string | null = null;

  return (
    <ol className="my-2 flex flex-col gap-1">
      {messages.map((m, idx) => {
        const mine = myUserId !== undefined && m.sender_id === myUserId;
        const currentDay = dayKey(m.created_at);
        const showDay = currentDay !== lastDayKey;
        if (showDay) lastDayKey = currentDay;

        const sameAsPrev = !showDay && lastSenderId === m.sender_id;
        const next = messages[idx + 1];
        const sameAsNext =
          next !== undefined &&
          next.sender_id === m.sender_id &&
          dayKey(next.created_at) === currentDay;
        lastSenderId = m.sender_id;

        const time = TIME_FORMATTER.format(new Date(m.created_at));

        const cornerClass = mine
          ? `rounded-2xl ${sameAsPrev ? "rounded-tr-md" : ""} ${
              sameAsNext ? "rounded-br-md" : ""
            }`
          : `rounded-2xl ${sameAsPrev ? "rounded-tl-md" : ""} ${
              sameAsNext ? "rounded-bl-md" : ""
            }`;

        return (
          <div key={m.id} className="contents">
            {showDay && (
              <li
                aria-hidden
                className="my-3 flex items-center justify-center"
              >
                <span className="rounded-full bg-[#f0e0d0] px-3 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#7a5e4d]">
                  {dayLabel(m.created_at)}
                </span>
              </li>
            )}
            <li
              className={`flex items-end gap-2 ${
                mine ? "justify-end" : "justify-start"
              } ${sameAsPrev ? "mt-0.5" : "mt-2"}`}
            >
              {!mine && (
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5dbc8] text-xs font-semibold text-[#2a1a14] ${
                    sameAsNext ? "invisible" : ""
                  }`}
                  aria-hidden
                >
                  {getInitial(counterpartName)}
                </div>
              )}
              <div
                className={`group relative max-w-[75%] px-3.5 py-2 text-sm leading-snug shadow-sm ${cornerClass} ${
                  mine
                    ? "bg-[#2a1a14] text-white"
                    : "bg-white text-[#2a1a14] ring-1 ring-[#f0e0d0]"
                }`}
              >
                <span className="whitespace-pre-wrap break-words">
                  {m.body}
                </span>
                <span
                  className={`ml-2 inline-block align-baseline text-[10px] tabular-nums ${
                    mine ? "text-[#d6c5b8]" : "text-[#a78a76]"
                  }`}
                >
                  {time}
                </span>
              </div>
            </li>
          </div>
        );
      })}
    </ol>
  );
}
