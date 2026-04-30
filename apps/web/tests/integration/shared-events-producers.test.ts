import { beforeEach, describe, expect, it } from "vitest";
import { resetData, serviceClient, SEED_IDS, SEED_EMAILS, signInAs } from "./_fixtures";
import {
  getEventsByCommune,
  getActiveProducersByCommune,
} from "@pretou/shared";

describe("getEventsByCommune", () => {
  beforeEach(async () => {
    await resetData();
    const svc = serviceClient();
    await svc.from("posts").insert([
      { title: "__evt_future__", body: "x", type: "evenement", event_date: new Date(Date.now() + 7 * 86400_000).toISOString(), commune_id: SEED_IDS.commune, author_id: SEED_IDS.admin },
      { title: "__evt_past__", body: "x", type: "evenement", event_date: new Date(Date.now() - 7 * 86400_000).toISOString(), commune_id: SEED_IDS.commune, author_id: SEED_IDS.admin },
      { title: "__discussion__", body: "x", type: "discussion", commune_id: SEED_IDS.commune, author_id: SEED_IDS.resident },
    ]);
  });

  it("returns only posts with type evenement for the commune", async () => {
    const { supabase } = await signInAs(SEED_EMAILS.resident);
    const { data, error } = await getEventsByCommune(supabase, SEED_IDS.commune);
    expect(error).toBeNull();
    const titles = (data ?? []).map((p) => p.title);
    expect(titles).toContain("__evt_future__");
    expect(titles).toContain("__evt_past__");
    expect(titles).not.toContain("__discussion__");
  });
});

describe("getActiveProducersByCommune", () => {
  beforeEach(async () => {
    await resetData();
    const svc = serviceClient();
    await svc.from("producers").insert([
      { name: "__prod_active__", description: "x", categories: ["maraicher"], commune_id: SEED_IDS.commune, created_by: SEED_IDS.admin, status: "active" },
      { name: "__prod_pending__", description: "x", categories: ["maraicher"], commune_id: SEED_IDS.commune, created_by: SEED_IDS.resident, status: "pending" },
    ]);
  });

  it("returns only active producers for the commune", async () => {
    // Sign in as admin because the producers_select RLS policy requires
    // the commune to share an EPCI with the user OR the user to be admin.
    // The test seed commune has no epci_id, so admin is the robust choice.
    const { supabase } = await signInAs(SEED_EMAILS.admin);
    const { data, error } = await getActiveProducersByCommune(supabase, SEED_IDS.commune);
    expect(error).toBeNull();
    const names = (data ?? []).map((p) => p.name);
    expect(names).toContain("__prod_active__");
    expect(names).not.toContain("__prod_pending__");
  });
});
