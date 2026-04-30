import { beforeEach, describe, expect, it } from "vitest";
import { resetData, serviceClient, SEED_IDS, SEED_EMAILS, signInAs } from "./_fixtures";
import { getPostsPaginated } from "@pretou/shared";

describe("getPostsPaginated filters", () => {
  beforeEach(async () => {
    await resetData();
    const svc = serviceClient();
    await svc.from("posts").insert([
      { title: "__filter_annonce__", body: "x", type: "annonce", commune_id: SEED_IDS.commune, author_id: SEED_IDS.admin },
      { title: "__filter_entraide__", body: "x", type: "entraide", commune_id: SEED_IDS.commune, author_id: SEED_IDS.resident },
    ]);
  });

  it("returns only posts of the requested types when types filter is passed", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await getPostsPaginated(supabase, SEED_IDS.commune, null, 50, {
      types: ["annonce"],
    });
    expect(error).toBeNull();
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__filter_annonce__");
    expect(titles).not.toContain("__filter_entraide__");
  });

  it("returns all types when types filter is absent", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data } = await getPostsPaginated(supabase, SEED_IDS.commune, null, 50, {});
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__filter_annonce__");
    expect(titles).toContain("__filter_entraide__");
  });

  it("accepts a `today` dateFilter and still returns posts inserted during the test", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data } = await getPostsPaginated(supabase, SEED_IDS.commune, null, 50, {
      dateFilter: "today",
    });
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__filter_annonce__");
  });
});
