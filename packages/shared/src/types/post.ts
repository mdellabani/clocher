import type { Database } from "./database";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

export type PostType = "annonce" | "evenement" | "entraide" | "discussion";

export type Post = PostRow & {
  profiles: { display_name: string; avatar_url: string | null };
  post_images: { id: string; storage_path: string }[];
  comments: { count: number }[];
  rsvps: { status: string }[];
};

export type CreatePostInput = Pick<PostInsert, "title" | "body" | "type" | "event_date" | "event_location" | "epci_visible">;
