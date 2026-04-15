"use client";

import { useState, useEffect } from "react";

interface HeroContent {
  title?: string;
  subtitle?: string;
  images?: string[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getImageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/website-images/${path}`;
}

export function HeroSection({ content }: { content: HeroContent }) {
  const images = content.images ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0 && !content.title) return null;

  return (
    <section className="relative overflow-hidden rounded-[14px]" style={{ minHeight: "320px" }}>
      {images.length > 0 && (
        <div className="absolute inset-0">
          {images.map((img, i) => (
            <img
              key={img}
              src={getImageUrl(img)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
              style={{ opacity: i === currentIndex ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
        </div>
      )}
      {!images.length && (
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))"
        }} />
      )}
      <div className="relative flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center text-white">
        {content.title && (
          <h1 className="text-3xl font-bold drop-shadow-lg sm:text-4xl">{content.title}</h1>
        )}
        {content.subtitle && (
          <p className="mt-3 text-lg opacity-90 drop-shadow">{content.subtitle}</p>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${i === currentIndex ? "bg-white w-4" : "bg-white/50 w-2"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
