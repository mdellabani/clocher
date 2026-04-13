import type { PostType } from "../types";

export const POST_TYPE_LABELS: Record<PostType, string> = {
  annonce: "Annonce officielle",
  evenement: "Événement",
  entraide: "Entraide",
  discussion: "Discussion",
};

export const POST_TYPE_COLORS: Record<PostType, string> = {
  annonce: "#dc2626",
  evenement: "#2563eb",
  entraide: "#16a34a",
  discussion: "#6b7280",
};

export const POST_TYPE_ICONS: Record<PostType, string> = {
  annonce: "megaphone",
  evenement: "calendar",
  entraide: "heart-handshake",
  discussion: "message-circle",
};
