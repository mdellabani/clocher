"use client";

interface CalendarEvent {
  date: string;
  title: string;
  type: string;
}

interface MiniCalendarProps {
  events?: CalendarEvent[];
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_DOT_COLORS: Record<string, string> = {
  evenement: "#D4871C",
  annonce: "#D35230",
  entraide: "#508A40",
  discussion: "#8B7355",
};

export function MiniCalendar({ events = [] }: MiniCalendarProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based: 0=Mon, 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const monthName = firstDay.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Map event dates to their types for dot display
  const eventsByDay = new Map<number, string[]>();
  for (const evt of events) {
    const d = new Date(evt.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate();
      const existing = eventsByDay.get(day) ?? [];
      existing.push(evt.type);
      eventsByDay.set(day, existing);
    }
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
      <h3 className="mb-3 text-sm font-semibold capitalize text-[var(--foreground)]">
        {monthName}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 font-medium text-[var(--muted-foreground)]"
          >
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          const dayEvents = day ? eventsByDay.get(day) : undefined;

          return (
            <div
              key={i}
              className={`relative flex h-8 items-center justify-center rounded-md text-xs ${
                isToday
                  ? "font-semibold text-white"
                  : day
                    ? "text-[var(--foreground)]"
                    : ""
              }`}
              style={isToday ? { backgroundColor: "var(--theme-primary)" } : undefined}
            >
              {day}
              {dayEvents && dayEvents.length > 0 && (
                <div className="absolute -bottom-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((type, j) => (
                    <span
                      key={j}
                      className="h-1 w-1 rounded-full"
                      style={{
                        backgroundColor: EVENT_DOT_COLORS[type] ?? "var(--theme-primary)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
