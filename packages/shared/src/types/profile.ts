import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = "resident" | "admin" | "epci_admin";
export type ProfileStatus = "pending" | "active" | "rejected";
