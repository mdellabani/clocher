import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("council_documents RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can insert and delete a council document", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await supabase
      .from("council_documents")
      .insert({
        commune_id: SEED_IDS.commune,
        title: "PV du conseil",
        category: "pv",
        document_date: "2026-04-01",
        storage_path: "councils/test.pdf",
      })
      .select()
      .single();
    expect(error).toBeNull();
    const { error: dErr } = await supabase.from("council_documents").delete().eq("id", data!.id);
    expect(dErr).toBeNull();
  });

  it("moderator cannot insert a council document", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase.from("council_documents").insert({
      commune_id: SEED_IDS.commune,
      title: "Hack",
      category: "pv",
      document_date: "2026-04-01",
      storage_path: "x.pdf",
    });
    expect(error).not.toBeNull();
  });

  it("resident cannot delete a council document", async () => {
    const svc = serviceClient();
    const { data } = await svc
      .from("council_documents")
      .insert({
        commune_id: SEED_IDS.commune,
        title: "PV",
        category: "pv",
        document_date: "2026-04-01",
        storage_path: "y.pdf",
      })
      .select()
      .single();
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase.from("council_documents").delete().eq("id", data!.id);
    const { data: still } = await svc
      .from("council_documents")
      .select("*")
      .eq("id", data!.id)
      .single();
    expect(still).not.toBeNull();
  });
});
