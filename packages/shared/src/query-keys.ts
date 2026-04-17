export type PostFilters = {
  types?: string[];
  date?: string;
  communeIds?: string[];
  scope?: "commune" | "epci";
};

export const queryKeys = {
  posts: {
    list: (communeId: string, filters?: PostFilters) =>
      ["posts", communeId, filters ?? {}] as const,
    pinned: (communeId: string) => ["posts", "pinned", communeId] as const,
    detail: (postId: string) => ["posts", "detail", postId] as const,
    epci: (epciId: string, communeIds?: string[]) =>
      ["posts", "epci", epciId, communeIds ?? []] as const,
  },
  profile: (userId: string) => ["profile", userId] as const,
  commune: (communeId: string) => ["commune", communeId] as const,
  events: (communeId: string) => ["events", communeId] as const,
  comments: (postId: string) => ["comments", postId] as const,
  rsvps: (postId: string) => ["rsvps", postId] as const,
  poll: (postId: string) => ["poll", postId] as const,
  producers: (communeId: string) => ["producers", communeId] as const,
  audit: (communeId: string) => ["audit", communeId] as const,
  reports: {
    pending: (communeId: string) => ["reports", "pending", communeId] as const,
  },
} as const;
