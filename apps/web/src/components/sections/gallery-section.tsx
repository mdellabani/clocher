"use client";

import { useState } from "react";

interface GalleryImage {
  url: string;
  caption?: string;
}

interface GalleryContent {
  images?: GalleryImage[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function GallerySection({ content }: { content: GalleryContent }) {
  const images = content.images ?? [];
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Galerie photos
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button key={i} onClick={() => setLightbox(i)}
            className="group relative overflow-hidden rounded-lg aspect-square">
            <img
              src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${img.url}?width=300&height=300&resize=cover`}
              alt={img.caption ?? ""}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white">{img.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}>
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${images[lightbox].url}`}
            alt={images[lightbox].caption ?? ""}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-white hover:bg-white/30">
            ✕
          </button>
        </div>
      )}
    </section>
  );
}
