"use client";

import { useEffect, useState } from "react";
import { Check, X, Building2, Clock, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAllCommunesWithAdmins,
  approveCommuneAction,
  rejectCommuneAction,
  revokeCommuneAction,
} from "./actions";

type CommuneAdmin = {
  id: string;
  display_name: string;
  created_at: string;
  status: string;
  commune_id: string;
  communes: {
    id: string;
    name: string;
    slug: string;
    code_postal: string;
    created_at: string;
  } | null;
};

export function SuperAdminDashboard() {
  const [admins, setAdmins] = useState<CommuneAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const res = await getAllCommunesWithAdmins();
    if (res.data) setAdmins(res.data as unknown as CommuneAdmin[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const pending = admins.filter((a) => a.status === "pending");
  const active = admins.filter((a) => a.status === "active");

  async function handleApprove(profileId: string) {
    const res = await approveCommuneAction(profileId);
    if (res.success) loadData();
  }

  async function handleReject(profileId: string, communeId: string) {
    if (!confirm("Refuser cette commune ? La commune sera supprimée.")) return;
    const res = await rejectCommuneAction(profileId, communeId);
    if (res.success) loadData();
  }

  async function handleRevoke(profileId: string, name: string) {
    if (!confirm(`Révoquer l'accès de ${name} ? L'admin ne pourra plus se connecter.`)) return;
    const res = await revokeCommuneAction(profileId);
    if (res.success) loadData();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
                    <p className="font-semibold">{p.communes?.name ?? "Commune inconnue"}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.communes?.code_postal} · Demandé par {p.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(p.id)}>
                      <Check size={14} className="mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(p.id, p.communes?.id ?? "")}
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

      {/* Active communes */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 size={18} />
          Communes actives ({active.length})
        </h2>

        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune commune active.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Commune</th>
                    <th className="px-4 py-3 font-medium">Code postal</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                    <th className="px-4 py-3 font-medium">Créée le</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{a.communes?.name}</td>
                      <td className="px-4 py-3">{a.communes?.code_postal}</td>
                      <td className="px-4 py-3">{a.display_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(a.communes?.created_at ?? a.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleRevoke(a.id, a.communes?.name ?? "")}
                        >
                          <ShieldOff size={14} className="mr-1" />
                          Révoquer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
