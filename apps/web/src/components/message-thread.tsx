import type { MessageRow } from "@pretou/shared";

export function MessageThread({
  messages,
  myUserId,
}: {
  messages: MessageRow[];
  myUserId?: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="my-4 text-sm text-[#7a5e4d]">
        Pas encore de message. Écrivez le premier.
      </p>
    );
  }
  return (
    <ol className="my-2 flex flex-col gap-2">
      {messages.map((m) => {
        const mine = myUserId !== undefined && m.sender_id === myUserId;
        return (
          <li
            key={m.id}
            className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
              mine
                ? "self-end bg-[#2a1a14] text-white"
                : "self-start bg-[#F5DBC8] text-[#2a1a14]"
            }`}
          >
            {m.body}
            <div
              className={`mt-1 text-[10px] ${
                mine ? "text-[#d6c5b8]" : "text-[#7a5e4d]"
              }`}
            >
              {new Date(m.created_at).toLocaleString("fr-FR")}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
