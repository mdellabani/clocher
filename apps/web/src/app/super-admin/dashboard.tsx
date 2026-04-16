"use client";

import { useEffect, useState } from "react";
import { Check, X, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPendingCommunes,
  approveCommuneAction,
  rejectCommuneAction,
  getAllCommunesAdmin,
} from "./actions";

type PendingCommune = {
  id: string;
  display_name: string;
  created_at: string;
  communes: {
    id: string;
    name: string;
    slug: string;
    code_postal: string;
    created_at: string;
  }[];
};

type CommuneRow = {
  id: string;
  name: string;
  slug: string;
  code_postal: string;
  created_at: string;
};

export function SuperAdminDashboard() {
  const [pending, setPending] = useState<PendingCommune[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const [pendingRes, communesRes] = await Promise.all([
      getPendingCommunes(),
      getAllCommunesAdmin(),
    ]);
    if (pendingRes.data) setPending(pendingRes.data as PendingCommune[]);
    if (communesRes.data) setCommunes(communesRes.data as CommuneRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApprove(profileId: string) {
    const res = await approveCommuneAction(profileId);
    if (res.success) {
      setPending((prev) => prev.filter((p) => p.id !== profileId));
      loadData(); // refresh communes list
    }
  }

  async function handleReject(profileId: string, communeId: string) {
    if (!confirm("Refuser cette commune ? La commune sera supprimée.")) return;
    const res = await rejectCommuneAction(profileId, communeId);
    if (res.success) {
      setPending((prev) => prev.filter((p) => p.id !== profileId));
      loadData();
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  return (
    <div className="space-y-8">
      {/* Pending registrations */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={18} />
          Inscriptions en attente
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              {pending.length}
            </span>
          )}
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune inscription en attente.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold">{p.communes[0]?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.communes[0]?.code_postal} · Demandé par {p.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(p.id)}
                    >
                      <Check size={14} className="mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(p.id, p.communes[0]?.id ?? "")}
                    >
                      <X size={14} className="mr-1" />
                      Refuser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* All communes */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 size={18} />
          Toutes les communes ({communes.length})
        </h2>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Commune</th>
                  <th className="px-4 py-3 font-medium">Code postal</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {communes.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.code_postal}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
