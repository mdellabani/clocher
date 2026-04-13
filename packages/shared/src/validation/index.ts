import { z } from "zod";

// Shared validation schemas used by both web and mobile apps
export const emailSchema = z.string().email("Invalid email address");
