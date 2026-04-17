import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, getCommune, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("invite_code regeneration RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can rotate invite_code", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const before = await getCommune(SEED_IDS.commune);
    const newCode = "TEST01";
    const { error } = await supabase
      .from("communes")
      .update({ invite_code: newCode })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.invite_code).toBe(newCode);
    expect(after?.invite_code).not.toBe(before?.invite_code);
  });

  it("moderator cannot rotate invite_code", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const before = await getCommune(SEED_IDS.commune);
    const { error } = await supabase
      .from("communes")
      .update({ invite_code: "MODHACK" })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.invite_code).toBe(before?.invite_code);
  });

  it("resident cannot rotate invite_code", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const before = await getCommune(SEED_IDS.commune);
    const { error } = await supabase
      .from("communes")
      .update({ invite_code: "RESHACK" })
      .eq("id", SEED_IDS.commune);
    expect(error).toBeNull();
    const after = await getCommune(SEED_IDS.commune);
    expect(after?.invite_code).toBe(before?.invite_code);
  });
});
