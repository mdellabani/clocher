interface SummaryCardsProps {
  pendingCount: number;
  postsThisWeek: number;
  openReports: number;
}

export function SummaryCards({ pendingCount, postsThisWeek, openReports }: SummaryCardsProps) {
  const cards = [
    {
      label: "Inscriptions en attente",
      value: pendingCount,
      dotColor: pendingCount > 0 ? "#D4871C" : undefined,
    },
    {
      label: "Publications cette semaine",
      value: postsThisWeek,
      dotColor: postsThisWeek > 0 ? "var(--theme-primary)" : undefined,
    },
    {
      label: "Signalements ouverts",
      value: openReports,
      dotColor: openReports > 0 ? "#D35230" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]"
        >
          <div className="flex items-center gap-2">
            <span className="text-3xl font-semibold text-[var(--foreground)]">
              {card.value}
            </span>
            {card.dotColor && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: card.dotColor }}
              />
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
