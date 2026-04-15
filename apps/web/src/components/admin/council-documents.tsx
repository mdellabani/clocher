"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileText, Upload } from "lucide-react";
import { uploadCouncilDocumentAction, deleteCouncilDocumentAction } from "@/app/admin/dashboard/council-actions";

const CATEGORY_LABELS: Record<string, string> = {
  deliberation: "Délibération",
  pv: "Procès-verbal",
  compte_rendu: "Compte-rendu",
};

interface CouncilDocument {
  id: string;
  title: string;
  category: string;
  document_date: string;
  storage_path: string;
}

interface CouncilDocumentsProps {
  documents: CouncilDocument[];
}

export function CouncilDocuments({ documents }: CouncilDocumentsProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    await uploadCouncilDocumentAction(formData);
    setUploading(false);
    e.currentTarget.reset();
    router.refresh();
  }

  async function handleDelete(id: string, storagePath: string) {
    if (!confirm("Supprimer ce document ?")) return;
    setDeleting(id);
    await deleteCouncilDocumentAction(id, storagePath);
    setDeleting(null);
    router.refresh();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--theme-primary)" }}>
        Conseil municipal
      </h2>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="mb-4 space-y-3 rounded-lg border border-[#e8dfd0] p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="title" required placeholder="Titre du document"
            className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
          <select name="category" required
            className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm">
            <option value="deliberation">Délibération</option>
            <option value="pv">Procès-verbal</option>
            <option value="compte_rendu">Compte-rendu</option>
          </select>
          <input name="document_date" type="date" required
            className="rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <input name="file" type="file" accept=".pdf" required className="text-sm" />
          <button type="submit" disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--theme-primary)" }}>
            <Upload size={14} />
            {uploading ? "Envoi..." : "Ajouter"}
          </button>
        </div>
      </form>

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Aucun document publié.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg bg-[#fafaf9] px-3 py-2">
              <div className="flex items-center gap-3">
                <FileText size={16} style={{ color: "var(--theme-primary)" }} />
                <div>
                  <a href={`${supabaseUrl}/storage/v1/object/public/council-documents/${doc.storage_path}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline" style={{ color: "var(--theme-primary)" }}>
                    {doc.title}
                  </a>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {CATEGORY_LABELS[doc.category]} — {new Date(doc.document_date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDelete(doc.id, doc.storage_path)}
                disabled={deleting === doc.id}
                className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
