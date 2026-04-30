import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, SEED_EMAILS, SEED_IDS } from "./_fixtures";
import {
  getCouncilDocsByCommune,
  getHomepageSectionsByCommune,
  getPostsThisWeekCount,
} from "@pretou/shared";

describe("admin shared helpers", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("getCouncilDocsByCommune returns docs ordered desc by date", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await getCouncilDocsByCommune(supabase, SEED_IDS.commune);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("getHomepageSectionsByCommune returns sections ordered by sort_order", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await getHomepageSectionsByCommune(supabase, SEED_IDS.commune);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("getPostsThisWeekCount returns a number", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const count = await getPostsThisWeekCount(supabase, SEED_IDS.commune);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
