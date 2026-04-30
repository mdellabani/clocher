"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

interface SettingsFormProps {
  userId: string;
  initialDisplayName: string;
  initialAvatarUrl?: string | null;
}

export function SettingsForm({ userId, initialDisplayName, initialAvatarUrl }: SettingsFormProps) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function resizeImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxWidth = 400;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, { type: "image/webp" });
                resolve(resizedFile);
              } else {
                resolve(file);
              }
            },
            "image/webp",
            0.85
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeAvatarPreview() {
    setAvatarFile(null);
    setAvatarPreview(null);
  }

  async function handleAvatarUpload() {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setStatus("idle");

    try {
      const resizedFile = await resizeImage(avatarFile);
      const supabase = createClient();

      const ext = resizedFile.name.split(".").pop() ?? "webp";
      const storagePath = `avatars/${userId}/${Date.now()}.${ext}`;
      const arrayBuffer = await resizedFile.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, arrayBuffer, { contentType: resizedFile.type });

      if (uploadError) {
        setStatus("error");
        setUploadingAvatar(false);
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${storagePath}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        setStatus("error");
        setUploadingAvatar(false);
        return;
      }

      setAvatarUrl(publicUrl);
      setAvatarFile(null);
      setAvatarPreview(null);
      setStatus("success");
      setUploadingAvatar(false);
      await qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    } catch (error) {
      setStatus("error");
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    setStatus("idle");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", userId);

    setSaving(false);
    setStatus(error ? "error" : "success");
    if (!error) {
      await qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    }
  }

  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <h2
        className="mb-4 text-sm font-semibold uppercase tracking-wide"
        style={{ color: "var(--theme-primary)" }}
      >
        Modifier mon profil
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Avatar (optionnel)
          </label>
          <div className="flex items-center gap-4">
            {avatarPreview || avatarUrl ? (
              <div className="relative h-24 w-24">
                <img
                  src={avatarPreview || avatarUrl || ""}
                  alt="Avatar preview"
                  className="h-full w-full rounded-full object-cover"
                />
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatarPreview}
                    className="absolute right-0 top-0 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200" />
            )}
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e8dfd0] px-3 py-2 text-sm hover:bg-[#fafaf9]">
                <span className="text-[var(--foreground)]">Choisir une photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                  disabled={uploadingAvatar}
                />
              </label>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "var(--theme-primary)" }}
                >
                  {uploadingAvatar ? "Upload..." : "Uploader l'avatar"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="display-name"
            className="text-sm font-medium text-[var(--foreground)]"
          >
            Nom d'affichage
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setStatus("idle");
            }}
            placeholder="Votre prénom ou nom"
            className="w-full rounded-lg border border-[#e8dfd0] bg-[#fafaf9] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
          />
        </div>

        {status === "success" && (
          <p className="text-sm text-green-600">
            Nom d'affichage mis à jour avec succès.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !displayName.trim()}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-primary)" }}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
