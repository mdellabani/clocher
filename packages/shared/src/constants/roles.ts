import type { Role } from "../types";

export const ROLE_LABELS: Record<Role, string> = {
  resident: "Résident",
  admin: "Administrateur",
  epci_admin: "Admin EPCI",
};

export const ADMIN_ROLES: Role[] = ["admin", "epci_admin"];
