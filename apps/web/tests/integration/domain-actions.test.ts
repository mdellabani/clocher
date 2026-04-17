import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, getCommune, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("custom_domain update RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin sets and clears custom_domain", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const set = await supabase
      .from("communes")
      .update({ custom_domain: "saintmedard.fr" })
      .eq("id", SEED_IDS.commune);
    expect(set.error).toBeNull();
    expect((await getCommune(SEED_IDS.commune))?.custom_domain).toBe("saintmedard.fr");

    const clear = await supabase
      .from("communes")
      .update({ custom_domain: null, domain_verified: false })
      .eq("id", SEED_IDS.commune);
    expect(clear.error).toBeNull();
    expect((await getCommune(SEED_IDS.commune))?.custom_domain).toBeNull();
  });

  it("moderator cannot set custom_domain", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase
      .from("communes")
      .update({ custom_domain: "evil.fr" })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.custom_domain).toBeNull();
  });
});
