"use client";

import { useState } from "react";

type TabKey = "dashboard" | "website" | "commune" | "members" | "posts" | "journal";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "dashboard", icon: "📊", label: "Tableau de bord" },
  { key: "website", icon: "🖼️", label: "Site web" },
  { key: "commune", icon: "🏛️", label: "Ma commune" },
  { key: "members", icon: "👥", label: "Membres" },
  { key: "posts", icon: "📋", label: "Publications" },
  { key: "journal", icon: "📜", label: "Journal" },
];

interface AdminTabsProps {
  dashboardContent: React.ReactNode;
  websiteContent: React.ReactNode;
  communeContent: React.ReactNode;
  membersContent: React.ReactNode;
  postsContent: React.ReactNode;
  journalContent: React.ReactNode;
}

export function AdminTabs({
  dashboardContent,
  websiteContent,
  communeContent,
  membersContent,
  postsContent,
  journalContent,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  const content: Record<TabKey, React.ReactNode> = {
    dashboard: dashboardContent,
    website: websiteContent,
    commune: communeContent,
    members: membersContent,
    posts: postsContent,
    journal: journalContent,
  };

  return (
    <div>
      {/* Tab pills */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-white"
                : "bg-white text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[#f0e8da]"
            }`}
            style={
              activeTab === tab.key
                ? { backgroundColor: "var(--theme-primary)" }
                : undefined
            }
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="space-y-6">
        {content[activeTab]}
      </div>
    </div>
  );
}
