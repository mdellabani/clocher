import { beforeEach, describe, expect, it } from "vitest";
import { resetData, signInAs, serviceClient, SEED_IDS, SEED_EMAILS } from "./_fixtures";

describe("page_sections RLS", () => {
  beforeEach(async () => {
    await resetData();
  });

  it("admin can insert, update, delete a page section", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data: inserted, error: iErr } = await supabase
      .from("page_sections")
      .insert({
        commune_id: SEED_IDS.commune,
        section_type: "hero",
        sort_order: 0,
        visible: true,
        content: { title: "Bienvenue" },
      })
      .select()
      .single();
    expect(iErr).toBeNull();
    expect(inserted).toBeTruthy();

    const { error: uErr } = await supabase
      .from("page_sections")
      .update({ content: { title: "Bonjour" } })
      .eq("id", inserted!.id);
    expect(uErr).toBeNull();

    const { error: dErr } = await supabase
      .from("page_sections")
      .delete()
      .eq("id", inserted!.id);
    expect(dErr).toBeNull();
  });

  it("moderator cannot insert a page section", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.moderator);
    const { error } = await supabase.from("page_sections").insert({
      commune_id: SEED_IDS.commune,
      section_type: "hero",
      sort_order: 0,
      visible: true,
      content: {},
    });
    expect(error).not.toBeNull();
  });

  it("resident cannot delete a page section", async () => {
    const svc = serviceClient();
    const { data } = await svc
      .from("page_sections")
      .insert({
        commune_id: SEED_IDS.commune,
        section_type: "hero",
        sort_order: 0,
        visible: true,
        content: {},
      })
      .select()
      .single();
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    await supabase.from("page_sections").delete().eq("id", data!.id);
    const { data: stillThere } = await svc
      .from("page_sections")
      .select("*")
      .eq("id", data!.id)
      .single();
    expect(stillThere).not.toBeNull();
  });
});
