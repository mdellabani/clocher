import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CreatePostInput } from "../types";

type Client = SupabaseClient<Database>;

export async function getPosts(client: Client, communeId: string) {
  return client
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status)")
    .eq("commune_id", communeId)
    .eq("is_hidden", false)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function getPostById(client: Client, postId: string) {
  return client
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path)")
    .eq("id", postId)
    .single();
}

export async function createPost(client: Client, communeId: string, authorId: string, input: CreatePostInput) {
  return client
    .from("posts")
    .insert({ ...input, commune_id: communeId, author_id: authorId })
    .select()
    .single();
}

export async function deletePost(client: Client, postId: string) {
  return client.from("posts").delete().eq("id", postId);
}

export async function togglePinPost(client: Client, postId: string, isPinned: boolean) {
  return client.from("posts").update({ is_pinned: !isPinned }).eq("id", postId);
}

export async function getPostsByType(client: Client, communeId: string, type: string) {
  return client
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status)")
    .eq("commune_id", communeId)
    .eq("type", type)
    .eq("is_hidden", false)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false });
}

export type PostListFilters = {
  types?: string[];
  dateFilter?: "today" | "week" | "month" | "";
};

function applyDateFilter<Q extends { gte: (col: string, v: string) => Q }>(
  query: Q,
  dateFilter: PostListFilters["dateFilter"],
): Q {
  if (dateFilter === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return query.gte("created_at", d.toISOString());
  }
  if (dateFilter === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return query.gte("created_at", d.toISOString());
  }
  if (dateFilter === "month") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return query.gte("created_at", d.toISOString());
  }
  return query;
}

export async function getPostsPaginated(
  client: Client,
  communeId: string,
  cursor: string | null,
  limit = 20,
  filters: PostListFilters = {},
) {
  let query = client
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status)")
    .eq("commune_id", communeId)
    .eq("is_hidden", false)
    .eq("is_pinned", false)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (filters.types && filters.types.length > 0) {
    query = query.in("type", filters.types);
  }
  query = applyDateFilter(query, filters.dateFilter);
  return query;
}

export async function getPinnedPosts(client: Client, communeId: string) {
  return client
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status), communes!commune_id(name)")
    .eq("commune_id", communeId)
    .eq("is_hidden", false)
    .eq("is_pinned", true)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false });
}

export async function getEventsByCommune(client: Client, communeId: string) {
  return client
    .from("posts")
    .select("id, title, body, type, event_date, event_location, created_at, profiles!author_id(display_name), rsvps(status)")
    .eq("commune_id", communeId)
    .eq("type", "evenement")
    .order("event_date", { ascending: true, nullsFirst: false });
}

export type AdminPostFilters = {
  types?: string[];
  dateFilter?: "today" | "week" | "month" | "";
  page: number;
  perPage: number;
};

export async function getAdminPostsPaginated(
  client: Client,
  communeId: string,
  filters: AdminPostFilters,
) {
  const { types = [], dateFilter = "", page, perPage } = filters;

  let dateSince: string | null = null;
  if (dateFilter === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    dateSince = d.toISOString();
  } else if (dateFilter === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    dateSince = d.toISOString();
  } else if (dateFilter === "month") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    dateSince = d.toISOString();
  }

  let countQuery = client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", communeId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
  if (types.length > 0) countQuery = countQuery.in("type", types);
  if (dateSince) countQuery = countQuery.gte("created_at", dateSince);
  const { count: totalCount } = await countQuery;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let postsQuery = client
    .from("posts")
    .select("id, title, type, is_pinned, created_at, profiles!author_id(display_name)")
    .eq("commune_id", communeId)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
  if (types.length > 0) postsQuery = postsQuery.in("type", types);
  if (dateSince) postsQuery = postsQuery.gte("created_at", dateSince);
  const { data: posts } = await postsQuery;

  return { posts: posts ?? [], totalCount: totalCount ?? 0 };
}
