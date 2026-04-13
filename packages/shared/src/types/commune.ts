import type { Database } from "./database";

export type Commune = Database["public"]["Tables"]["communes"]["Row"];
export type EPCI = Database["public"]["Tables"]["epci"]["Row"];
