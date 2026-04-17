import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("profiles SELECT RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can read own profile (regression: missing tab bug)", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", SEED_IDS.admin)
      .single();
    expect(error).toBeNull();
    expect(data?.role).toBe("admin");
  });

  it("resident can read own profile", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", SEED_IDS.resident)
      .single();
    expect(error).toBeNull();
    expect(data?.role).toBe("resident");
  });

  it("user can read other profiles in own commune", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", SEED_IDS.admin)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(SEED_IDS.admin);
  });

  it("user cannot read profiles in another commune", async () => {
    const svc = serviceClient();
    // Create a second commune + a profile in it.
    await svc.from("communes").insert({
      id: "00000000-0000-0000-0000-000000000099",
      name: "Other",
      slug: "other",
      code_postal: "12345",
      theme: "terre_doc",
      invite_code: "OTHER1",
    });
    await svc.from("profiles").insert({
      id: "00000000-0000-0000-0000-000000000999",
      commune_id: "00000000-0000-0000-0000-000000000099",
      display_name: "Stranger",
      role: "resident",
      status: "active",
    });
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000999")
      .maybeSingle();
    expect(data).toBeNull();
  });
});
